var A=Object.defineProperty;var D=(a,e,t)=>e in a?A(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var o=(a,e,t)=>(D(a,typeof e!="symbol"?e+"":e,t),t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function t(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerpolicy&&(r.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?r.credentials="include":n.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(n){if(n.ep)return;n.ep=!0;const r=t(n);fetch(n.href,r)}})();const S=a=>{const e=document.getElementById("display");e.setAttribute("style","padding: 5px; background: #FFF9");const t=document.createElement("div");if(a.controls)e.append(t,...a.controls);else{const i=document.createElement("button");i.innerText="Restart",i.onclick=()=>a.restart(),e.append(t,i)}let s=90,n=-1;const r=i=>{n<0?n=i:s=s*.95+1e3/(i-n)*.05,t.innerHTML="FPS: "+Math.round(s);const u=Math.min((i-n)/1e3,.02);n=i,a.update(u),window.requestAnimationFrame(r)};window.requestAnimationFrame(r)};class b{constructor(e,t,s,n){o(this,"pipeline");o(this,"bind_group");o(this,"render",(e,t,s=1,n=1)=>{const r=e.beginComputePass();r.setPipeline(this.pipeline),r.setBindGroup(0,this.bind_group),r.dispatchWorkgroups(t,s,n),r.end()});const r=e.createBindGroupLayout({entries:n.map((u,c)=>({binding:c,visibility:GPUShaderStage.COMPUTE,buffer:u.type==="buffer"?{type:u.binding}:void 0,storageTexture:u.type==="texture"?{access:"write-only",format:"rgba8unorm",viewDimension:"2d"}:void 0}))});this.bind_group=e.createBindGroup({layout:r,entries:n.map((u,c)=>({binding:c,resource:u.type==="texture"?u.view:{buffer:u.buffer}}))});const i=e.createPipelineLayout({bindGroupLayouts:[r]});this.pipeline=e.createComputePipeline({layout:i,compute:{module:e.createShaderModule({code:t}),entryPoint:s}})}}var w=`@group(0) @binding(0) var colour_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> scene: Scene;
@group(0) @binding(2) var<storage, read_write> chasers: ChaserData;
@group(0) @binding(3) var<storage, read_write> values: ValueData;

struct Scene {
    dt: f32,
    time: f32,
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

const max_u32 = f32(4294967296); 
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
}`,I=`@group(0) @binding(0) var screen_sampler: sampler;
@group(0) @binding(1) var colour_buffer: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) TexCoord: vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
    let positions = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
    );

    let texCoords = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0),
    );

    var output: VertexOutput;
    output.Position = vec4<f32>(positions[VertexIndex], 0.0, 1.0);
    output.TexCoord = texCoords[VertexIndex];
    return output;
}

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(colour_buffer, screen_sampler, TexCoord);
}`;class T{constructor(e,t){o(this,"pipeline");o(this,"bind_group");o(this,"render",(e,t)=>{const s=e.beginRenderPass({colorAttachments:[{view:t,loadOp:"clear",storeOp:"store"}]});s.setPipeline(this.pipeline),s.setBindGroup(0,this.bind_group),s.draw(6,1,0,0),s.end()});const s={addressModeU:"repeat",addressModeV:"repeat",magFilter:"linear",minFilter:"nearest",mipmapFilter:"nearest",maxAnisotropy:1},n=e.createSampler(s),r=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}}]});this.bind_group=e.createBindGroup({layout:r,entries:[{binding:0,resource:n},{binding:1,resource:t}]});const i=e.createPipelineLayout({bindGroupLayouts:[r]});this.pipeline=e.createRenderPipeline({layout:i,vertex:{module:e.createShaderModule({code:I}),entryPoint:"vert_main"},fragment:{module:e.createShaderModule({code:I}),entryPoint:"frag_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}})}}class _{constructor(e,t,s,n,r,i,u,c){o(this,"canvas");o(this,"device");o(this,"context");o(this,"chasers");o(this,"background_computer");o(this,"chaser_computer");o(this,"draw_computer");o(this,"texturer");o(this,"sceneBuffer");o(this,"time",new Date().valueOf());o(this,"render",e=>{this.time+=e*1e3,this.device.queue.writeBuffer(this.sceneBuffer,0,new Float32Array([e,this.time]));const t=this.device.createCommandEncoder();this.background_computer.render(t,this.canvas.width,this.canvas.height),this.chaser_computer.render(t,this.chasers/1e3,1e3),this.draw_computer.render(t,this.canvas.width,this.canvas.height),this.texturer.render(t,this.context.getCurrentTexture().createView()),this.device.queue.submit([t.finish()])});o(this,"setAcceleration",e=>{this.device.queue.writeBuffer(this.sceneBuffer,16,new Float32Array([e]))});o(this,"setVelocity",e=>{this.device.queue.writeBuffer(this.sceneBuffer,20,new Float32Array([e]))});o(this,"setSensor",e=>{this.device.queue.writeBuffer(this.sceneBuffer,24,new Float32Array([e]))});o(this,"setRange",e=>{this.device.queue.writeBuffer(this.sceneBuffer,28,new Float32Array([e]))});o(this,"setHalflife",e=>{this.device.queue.writeBuffer(this.sceneBuffer,32,new Float32Array([e]))});this.canvas=e,this.device=t,this.chasers=s;const l=e.getContext("webgpu");if(!l)throw Error("No GPU context available");l.configure({device:t,format:"bgra8unorm",alphaMode:"opaque"}),this.context=l;const d=U(t,e.width,e.height);this.sceneBuffer=t.createBuffer({size:36,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const h=new Float32Array([0,0,this.canvas.width,this.canvas.height,n,r,i,u,c]);t.queue.writeBuffer(this.sceneBuffer,0,h);const f=t.createBuffer({size:16*s,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),p=new Float32Array(4*s);for(let m of[...Array(s).keys()]){const G=Math.sqrt(Math.random())*Math.min(e.height,e.width)*.4,y=Math.random()*Math.PI*2;p[m*4]=e.width/2+G*Math.sin(y),p[m*4+1]=e.height/2+G*Math.cos(y),p[m*4+2]=(Math.PI+y)%(Math.PI*2),p[m*4+3]=0}t.queue.writeBuffer(f,0,p);const B=t.createBuffer({size:4*e.width*e.height*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(B,0,new Float32Array([...Array(4*e.width*e.height).map(()=>0)]));const v=[{type:"texture",view:d},{type:"buffer",buffer:this.sceneBuffer,binding:"uniform"},{type:"buffer",buffer:f,binding:"storage"},{type:"buffer",buffer:B,binding:"storage"}];this.background_computer=new b(t,w,"fade_values",v),this.chaser_computer=new b(t,w,"update_and_draw_points",v),this.draw_computer=new b(t,w,"draw_to_texture",v),this.texturer=new T(t,d)}static async from(e,t,s=5,n=50,r=10,i=2,u=.1){var d;const c=await((d=navigator.gpu)==null?void 0:d.requestAdapter()),l=await(c==null?void 0:c.requestDevice());if(!l)throw new Error("No GPU device found!");return new _(e,l,t*1e3,s,n,r,i,u)}}const U=(a,e,t)=>a.createTexture({size:{width:e,height:t},format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}).createView();class x{constructor(e,t,s,n,r,i,u,c){o(this,"canvas");o(this,"chasers");o(this,"controls");o(this,"runner");this.runner=e,this.canvas=t,this.chasers=s;const l=document.createElement("div");l.setAttribute("style","display: flex");const d=document.createElement("input");d.setAttribute("style","flex-shrink: 1; min-width: 0;"),d.defaultValue=""+s;const h=document.createElement("button");h.innerText="Restart",h.onclick=()=>{const f=Number(d.value||s);f&&!isNaN(f)&&(this.chasers=f,this.restart())},l.append(d,h),this.controls=[l,g("Acceleration",n,this.runner.setAcceleration),g("Velocity",r,this.runner.setVelocity),g("Sensor",i,this.runner.setSensor),g("Range",u,this.runner.setRange),g("Halflife",c,this.runner.setHalflife)]}static async from(e,t,s=5,n=50,r=10,i=2,u=.1){const c=window.devicePixelRatio||1;t.width=window.innerWidth*c,t.height=window.innerHeight*c,t.style.width=window.innerWidth+"px",t.style.height=window.innerHeight+"px";const l=await _.from(t,Math.round(e/1e3),s,n,r,i,u);return new x(l,t,e,s,n,r,i,u)}update(e){this.runner.render(e)}restart(){_.from(this.canvas,Math.max(Math.round(this.chasers/1e3),1)).then(e=>this.runner=e)}}const g=(a,e,t)=>{const s=document.createElement("div");s.setAttribute("style","display: flex");const n=document.createElement("p");n.setAttribute("style","flex-grow: 1; margin: 0"),n.innerText=a+":";const r=document.createElement("input");r.setAttribute("style","width: 30px; text-align: right;"),r.defaultValue=""+e;const i=()=>{const u=Number(r.value);isNaN(u)||t(u)};return r.onblur=i,r.onkeydown=u=>{u.code==="Enter"&&i()},s.append(n,r),s},P=document.getElementById("canvas");x.from(4e5,P).then(a=>{S(a),window.simulation=a}).catch(()=>{var e;const a=document.createElement("h4");a.innerText="This app does not work without Web GPU - try running Chrome Canary or Firefox Nightly, and enabling Web GPU",(e=P.parentElement)==null||e.appendChild(a)});
