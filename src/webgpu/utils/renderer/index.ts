import code from "./shader.wgsl";

export class TextureRendererShader {
    pipeline: GPURenderPipeline;
    bind_group: GPUBindGroup;
    getTarget: () => GPUTextureView;

    constructor(device: GPUDevice, source: GPUTextureView, getTarget: () => GPUTextureView) {
        this.getTarget = getTarget;

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: "repeat",
            addressModeV: "repeat",
            magFilter: "linear",
            minFilter: "nearest",
            mipmapFilter: "nearest",
            maxAnisotropy: 1,
        };
        const sampler = device.createSampler(samplerDescriptor);

        const bind_group_layout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {},
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {},
                },
            ],
        });
        this.bind_group = device.createBindGroup({
            layout: bind_group_layout,
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: source },
            ],
        });

        // Pipeline
        const pipeline_layout = device.createPipelineLayout({ bindGroupLayouts: [bind_group_layout] });
        this.pipeline = device.createRenderPipeline({
            label: "texture-display-renderer",
            layout: pipeline_layout,
            vertex: {
                module: device.createShaderModule({ code }),
                entryPoint: "vert_main",
            },
            fragment: {
                module: device.createShaderModule({ code }),
                entryPoint: "frag_main",
                targets: [{ format: "bgra8unorm" }],
            },
            primitive: { topology: "triangle-list" },
        });
    }

    renderer = (commandEncoder: GPUCommandEncoder) => {
        const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{ view: this.getTarget(), loadOp: "clear", storeOp: "store" }],
        });
        renderpass.setPipeline(this.pipeline);
        renderpass.setBindGroup(0, this.bind_group);
        renderpass.draw(6, 1, 0, 0);
        renderpass.end();
    };
}
