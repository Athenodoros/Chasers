export type GPUAssetBinding = GPUAssetBuffer | GPUAssetTexture;

export interface GPUAssetBuffer {
    type: "buffer";
    buffer: GPUBuffer;
    binding: GPUBufferBindingType;
}

export interface GPUAssetTexture {
    type: "texture";
    texture: GPUTexture;
    view: GPUTextureView;
}

type GPUCommand = (commandEncoder: GPUCommandEncoder) => void;

export class GPUAssetUtility {
    private device: GPUDevice;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    getFloat32Buffer(type: GPUBufferBindingType, values: number[] | Float32Array, usage?: number): GPUAssetBuffer;
    getFloat32Buffer(type: GPUBufferBindingType, lengthInBytes: number, usage?: number): GPUAssetBuffer;
    getFloat32Buffer(
        type: GPUBufferBindingType,
        lengthOrValues: number | number[] | Float32Array,
        rawUsage: number = 0
    ): GPUAssetBuffer {
        // Set usage flags
        let usage = rawUsage;
        if (type === "uniform") usage |= GPUBufferUsage.UNIFORM;
        else usage |= GPUBufferUsage.STORAGE;
        if (Array.isArray(lengthOrValues) || lengthOrValues instanceof Float32Array) usage |= GPUBufferUsage.COPY_DST;

        // Get buffer details
        const length = typeof lengthOrValues === "number" ? lengthOrValues : lengthOrValues.length;
        const buffer = this.device.createBuffer({ size: length * 4, usage }); // 4 bytes per float

        // Copy values to buffer
        if (lengthOrValues instanceof Float32Array) this.device.queue.writeBuffer(buffer, 0, lengthOrValues);
        else if (Array.isArray(lengthOrValues))
            this.device.queue.writeBuffer(buffer, 0, new Float32Array(lengthOrValues));

        // Return asset
        return { type: "buffer", buffer, binding: type };
    }

    getTextureView(width: number, height: number): GPUAssetTexture {
        const texture = this.device.createTexture({
            size: { width, height },
            format: "rgba8unorm",
            usage:
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC,
        });
        return { type: "texture", texture, view: texture.createView() };
    }

    getCanvasContext(canvas: HTMLCanvasElement): GPUCanvasContext {
        const context = canvas.getContext("webgpu");
        if (!context) throw Error("No GPU context available");
        context.configure({ device: this.device, format: "bgra8unorm", alphaMode: "opaque" });
        return context;
    }

    getCommandRunner(commands: GPUCommand[]): () => void {
        return () => {
            const commandEncoder = this.device.createCommandEncoder();
            for (const command of commands) command(commandEncoder);
            this.device.queue.submit([commandEncoder.finish()]);
        };
    }
}
