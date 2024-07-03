@group(0) @binding(0) var colour_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: Scene;
@group(0) @binding(2) var<storage, read_write> chasers: ChaserData;
@group(0) @binding(3) var<storage, read_write> values: ValueData;

struct Scene {
    dt: f32,
    _time: f32,
    width: f32,
    height: f32,
    acc: f32,
    velocity: f32,
    sensor: f32,
    range: f32,
    halflife: f32,
}

struct Chaser {
    position: vec2<f32>,
    heading: f32,
}
struct ChaserData {
    chasers: array<Chaser>,
}

struct ValueData {
    values: array<f32>,
}

const background = vec4<f32>(10.0 / 255, 9.0 / 255, 26.0 / 255, 1);
const foreground = vec4<f32>(224.0 / 255, 231.0 / 255, 255.0 / 255, 1);

@compute @workgroup_size(1,1,1)
fn fade_values(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let point = GlobalInvocationID.xy;
    var value = get_value_at_point(point);
    if (value < 0.001) {
        value = 0;
    }
    put_value_at_point(value * alpha(), point);
}

@compute @workgroup_size(1,1,1)
fn update_and_draw_points(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let id = i32(GlobalInvocationID.x * 1000 + GlobalInvocationID.y);

    let left = sample_data_at_location(
        chasers.chasers[id].position.x + scene.sensor * sin(chasers.chasers[id].heading - radians(60)),
        chasers.chasers[id].position.y + scene.sensor * cos(chasers.chasers[id].heading - radians(60))
    );
    let center = sample_data_at_location(
        chasers.chasers[id].position.x + scene.sensor * sin(chasers.chasers[id].heading),
        chasers.chasers[id].position.y + scene.sensor * cos(chasers.chasers[id].heading)
    );
    let right = sample_data_at_location(
        chasers.chasers[id].position.x + scene.sensor * sin(chasers.chasers[id].heading + radians(60)),
        chasers.chasers[id].position.y + scene.sensor * cos(chasers.chasers[id].heading + radians(60))
    );

    if (center >= left && center >= right) {
        chasers.chasers[id].heading += (prng(GlobalInvocationID.x, u32(scene.dt)) * 0.4 - 0.2) * scene.acc * scene.dt;
    }
    else if (left >= center && left >= right) {
        chasers.chasers[id].heading -= (prng(GlobalInvocationID.x, u32(scene.dt)) * 0.4 + 0.8) * scene.acc * scene.dt;
    } else if (right >= center && right >= left) {
        chasers.chasers[id].heading += (prng(GlobalInvocationID.x, u32(scene.dt)) * 0.4 + 0.8) * scene.acc * scene.dt;
    }

    chasers.chasers[id].position.x += scene.velocity * scene.dt * sin(chasers.chasers[id].heading);
    chasers.chasers[id].position.y += scene.velocity * scene.dt * cos(chasers.chasers[id].heading);

    if (chasers.chasers[id].position.x < 0.0) {
        chasers.chasers[id].position.x = 0.0;
    }
    if (chasers.chasers[id].position.x > scene.width) {
        chasers.chasers[id].position.x = scene.width;
    }
    if (chasers.chasers[id].position.y < 0.0) {
        chasers.chasers[id].position.y = 0.0;
    }
    if (chasers.chasers[id].position.y > scene.height) {
        chasers.chasers[id].position.y = scene.height;
    }

    put_value_at_point(1.0, vec2<u32>(chasers.chasers[id].position));
}

@compute @workgroup_size(1,1,1)
fn draw_to_texture(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    let value = get_value_at_point(GlobalInvocationID.xy);
    let colour = value * foreground + (1.0 - value) * background;
    textureStore(colour_buffer, vec2<u32>(GlobalInvocationID.x, u32(scene.height) - GlobalInvocationID.y), colour);
}

// Helpers

fn put_value_at_point(value: f32, point: vec2<u32>) {
    values.values[get_index_of_point(point)] = value;
}

fn get_value_at_point(point: vec2<u32>) -> f32 {
    return values.values[get_index_of_point(point)];
}

fn get_index_of_point(point: vec2<u32>) -> u32 {
    return (point.y * u32(scene.width)) + point.x;
}

fn alpha() -> f32 {
    return pow(scene.halflife, scene.dt);
}

fn radial(r: f32, angle: f32) -> vec2<f32> {
    return vec2<f32>(r * cos(angle), r * sin(angle));
}

// Hash function www.cs.ubc.ca/~rbridson/docs/schechter-sca08-turbulence.pdf
const max_u32 = f32(4294967296); // 2 ^ 32;
fn prng(id1: u32, id2: u32) -> f32 {
    return f32(hash(hash(id1) * id2)) / max_u32;
}
fn hash(state: u32) -> u32 {
    var result = state;
    result ^= 2747636419;
    result *= 2654435769;
    result ^= result >> 16;
    result *= 2654435769;
    result ^= result >> 16;
    result *= 2654435769;
    return result;
}

fn sample_data_at_location(xf: f32, yf: f32) -> f32 {
    var total = 0.0;

    for (var dx: f32 = -scene.range; dx <= scene.range; dx += 1.0) {
        for (var dy: f32 = -scene.range; dy <= scene.range; dy += 1.0) {
            if (
                xf + dx < 0 ||
                xf + dx >= scene.width ||
                yf + dy < 0 ||
                yf + dy >= scene.height
            ) {
                total -= 10.0;
            } else {
                total += max(0.0, get_value_at_point(vec2<u32>(u32(xf + dx), u32(yf + dy))));
            }
        }
    }

    let count = pow(f32(2 * scene.range + 1), 2.0);
    return total / count;
}
