var M=Object.defineProperty;var F=(a,e,n)=>e in a?M(a,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):a[e]=n;var c=(a,e,n)=>(F(a,typeof e!="symbol"?e+"":e,n),n);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))s(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerpolicy&&(r.referrerPolicy=t.referrerpolicy),t.crossorigin==="use-credentials"?r.credentials="include":t.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(t){if(t.ep)return;t.ep=!0;const r=n(t);fetch(t.href,r)}})();const N=a=>{const e=document.getElementById("display");e.setAttribute("style","padding: 5px; background: #FFF9");const n=document.createElement("div");if(a.controls)e.append(n,...a.controls);else{const o=document.createElement("button");o.innerText="Restart",o.onclick=()=>a.restart(),e.append(n,o)}let s=90,t=-1;const r=o=>{t<0?t=o:s=s*.95+1e3/(o-t)*.05,n.innerHTML="FPS: "+Math.round(s);const i=Math.min((o-t)/1e3,.02);t=o,a.update(i),window.requestAnimationFrame(r)};window.requestAnimationFrame(r)};var m=`@group(0) @binding(0) var colour_buffer: texture_storage_2d<rgba8unorm, write>;
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
}`;class V{constructor(e){c(this,"device");this.device=e}getFloat32Buffer(e,n,s=0){let t=s;e==="uniform"?t|=GPUBufferUsage.UNIFORM:t|=GPUBufferUsage.STORAGE,(Array.isArray(n)||n instanceof Float32Array)&&(t|=GPUBufferUsage.COPY_DST);const r=typeof n=="number"?n:n.length,o=this.device.createBuffer({size:r*4,usage:t});return n instanceof Float32Array?this.device.queue.writeBuffer(o,0,n):Array.isArray(n)&&this.device.queue.writeBuffer(o,0,new Float32Array(n)),{type:"buffer",buffer:o,binding:e}}getTextureView(e,n){const s=this.device.createTexture({size:{width:e,height:n},format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});return{type:"texture",texture:s,view:s.createView()}}getCanvasContext(e){const n=e.getContext("webgpu");if(!n)throw Error("No GPU context available");return n.configure({device:this.device,format:"bgra8unorm",alphaMode:"opaque"}),n}getCommandRunner(e){return()=>{const n=this.device.createCommandEncoder();for(const s of e)s(n);this.device.queue.submit([n.finish()])}}}class v{constructor(e,n,s,t){c(this,"pipeline");c(this,"bind_group");c(this,"runner",(e,n=1,s=1)=>t=>{const r=t.beginComputePass();r.setPipeline(this.pipeline),r.setBindGroup(0,this.bind_group),r.dispatchWorkgroups(e,n,s),r.end()});const r=e.createBindGroupLayout({entries:t.map((i,l)=>({binding:l,visibility:GPUShaderStage.COMPUTE,buffer:i.type==="buffer"?{type:i.binding}:void 0,storageTexture:i.type==="texture"?{access:"write-only",format:"rgba8unorm",viewDimension:"2d"}:void 0}))});this.bind_group=e.createBindGroup({layout:r,entries:t.map((i,l)=>({binding:l,resource:i.type==="texture"?i.view:{buffer:i.buffer}}))});const o=e.createPipelineLayout({bindGroupLayouts:[r]});this.pipeline=e.createComputePipeline({layout:o,compute:{module:e.createShaderModule({code:n}),entryPoint:s}})}}var b=`@group(0) @binding(0) var screen_sampler: sampler;
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
}`;class R{constructor(e,n,s){c(this,"pipeline");c(this,"bind_group");c(this,"getTarget");c(this,"renderer",e=>{const n=e.beginRenderPass({colorAttachments:[{view:this.getTarget(),loadOp:"clear",storeOp:"store"}]});n.setPipeline(this.pipeline),n.setBindGroup(0,this.bind_group),n.draw(6,1,0,0),n.end()});this.getTarget=s;const t={addressModeU:"repeat",addressModeV:"repeat",magFilter:"linear",minFilter:"nearest",mipmapFilter:"nearest",maxAnisotropy:1},r=e.createSampler(t),o=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}}]});this.bind_group=e.createBindGroup({layout:o,entries:[{binding:0,resource:r},{binding:1,resource:n}]});const i=e.createPipelineLayout({bindGroupLayouts:[o]});this.pipeline=e.createRenderPipeline({label:"texture-display-renderer",layout:i,vertex:{module:e.createShaderModule({code:b}),entryPoint:"vert_main"},fragment:{module:e.createShaderModule({code:b}),entryPoint:"frag_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}})}}class p{constructor(e,n,s){c(this,"runner");c(this,"writeSceneValue");c(this,"render",e=>{this.writeSceneValue(0,e),this.runner()});c(this,"setAcceleration",e=>this.writeSceneValue(16,e));c(this,"setVelocity",e=>this.writeSceneValue(20,e));c(this,"setSensor",e=>this.writeSceneValue(24,e));c(this,"setRange",e=>this.writeSceneValue(28,e));c(this,"setHalflife",e=>this.writeSceneValue(32,e));const{thousands:t,acceleration:r,velocity:o,sensor:i,range:l,halflife:I}=s,G=t*1e3,u=new V(n),P=u.getCanvasContext(e),S=[0,0,e.width,e.height,r,o,i,l,I],C=[...Array(G)].flatMap(()=>{const h=Math.sqrt(Math.random())*Math.min(e.height,e.width)*.4,d=Math.random()*Math.PI*2;return[e.width/2+h*Math.sin(d),e.height/2+h*Math.cos(d),(Math.PI+d)%(Math.PI*2),0]}),_=u.getTextureView(e.width,e.height),x=u.getFloat32Buffer("uniform",S),T=u.getFloat32Buffer("storage",C),A=u.getFloat32Buffer("storage",e.width*e.height*4),g=[_,x,T,A];this.writeSceneValue=(h,...d)=>n.queue.writeBuffer(x.buffer,h,new Float32Array(d));const D=new v(n,m,"fade_values",g),B=new v(n,m,"update_and_draw_points",g),U=new v(n,m,"draw_to_texture",g),E=new R(n,_.view,()=>P.getCurrentTexture().createView());this.runner=u.getCommandRunner([D.runner(e.width,e.height),B.runner(t,1e3),U.runner(e.width,e.height),E.renderer])}static async from(e,n){var r;const s=await((r=navigator.gpu)==null?void 0:r.requestAdapter());if(!s)throw new Error("No GPU device found!");const t=await s.requestDevice();return new p(e,t,n)}}const k=(a,e=window.innerWidth,n=window.innerHeight)=>{const s=window.devicePixelRatio||1;a.width=e*s,a.height=n*s,a.style.width=e+"px",a.style.height=n+"px"};class y{constructor(e,n,s){c(this,"canvas");c(this,"controls");c(this,"config");c(this,"runner");this.runner=e,this.canvas=n,this.config=s;const t=document.createElement("div");t.setAttribute("style","display: flex");const r=document.createElement("input");r.setAttribute("style","flex-shrink: 1; min-width: 0;"),r.defaultValue=""+s.thousands;const o=document.createElement("button");o.innerText="Restart",o.onclick=()=>{const i=Number(r.value||s.thousands);i&&!isNaN(i)&&(this.config.thousands=i,this.restart())},t.append(r,o),this.controls=[t,f("Acceleration",s.acceleration,i=>{this.config.acceleration=i,this.runner.setAcceleration(i)}),f("Velocity",s.velocity,i=>{this.config.velocity=i,this.runner.setVelocity(i)}),f("Sensor",s.sensor,i=>{this.config.sensor=i,this.runner.setSensor(i)}),f("Range",s.range,i=>{this.config.range=i,this.runner.setRange(i)}),f("Halflife",s.halflife,i=>{this.config.halflife=i,this.runner.setHalflife(i)})]}static async from(e,n=L){k(e);const s=await p.from(e,n);return new y(s,e,n)}update(e){this.runner.render(e)}restart(){p.from(this.canvas,this.config).then(e=>this.runner=e)}}const L={thousands:400,acceleration:3,velocity:200,sensor:10,range:2,halflife:.1},f=(a,e,n)=>{const s=document.createElement("div");s.setAttribute("style","display: flex");const t=document.createElement("p");t.setAttribute("style","flex-grow: 1; margin: 0"),t.innerText=a+":";const r=document.createElement("input");r.setAttribute("style","width: 30px; text-align: right;"),r.defaultValue=""+e;const o=()=>{const i=Number(r.value);isNaN(i)||n(i)};return r.onblur=o,r.onkeydown=i=>{i.code==="Enter"&&o()},s.append(t,r),s},w=document.getElementById("canvas");y.from(w).then(a=>{N(a),window.simulation=a}).catch(()=>{var e;const a=document.createElement("h4");a.innerText="This app does not work without Web GPU - try running Chrome Canary or Firefox Nightly, and enabling Web GPU",(e=w.parentElement)==null||e.appendChild(a)});
