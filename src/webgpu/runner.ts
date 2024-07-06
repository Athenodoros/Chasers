import compute_kernel from "./compute_kernel.wgsl";
import { GPUAssetUtility } from "./utils/GPUAssetUtility";
import { ComputeShaderRunner } from "./utils/compute";
import { TextureRendererShader } from "./utils/renderer";

export interface RunnerConfig {
    thousands: number;
    acceleration: number;
    velocity: number;
    sensor: number;
    range: number;
    halflife: number;
}

export class Runner {
    private runner: () => void;
    private writeSceneValue: (index: number, ...values: number[]) => void;

    static async from(canvas: HTMLCanvasElement, config: RunnerConfig) {
        const adapter = await navigator.gpu?.requestAdapter();
        if (!adapter) throw new Error("No GPU device found!");
        const device = await adapter.requestDevice();
        return new Runner(canvas, device, config);
    }

    private constructor(canvas: HTMLCanvasElement, device: GPUDevice, config: RunnerConfig) {
        const { thousands, acceleration, velocity, sensor, range, halflife } = config;
        const chasers = thousands * 1000;

        const utility = new GPUAssetUtility(device);
        const context = utility.getCanvasContext(canvas);

        // Assets

        const scene = [0, 0, canvas.width, canvas.height, acceleration, velocity, sensor, range, halflife];
        const chaserValues = [...Array(chasers)].flatMap(() => {
            const r = Math.sqrt(Math.random()) * Math.min(canvas.height, canvas.width) * 0.4;
            const theta = Math.random() * Math.PI * 2;

            return [
                canvas.width / 2 + r * Math.sin(theta),
                canvas.height / 2 + r * Math.cos(theta),
                (Math.PI + theta) % (Math.PI * 2),
                0, // Blocks round up to multiple of 16 bytes (from 2 * 4 + 4 = 12 in the Chaser struct )
            ];
        });

        const colourBufferView = utility.getTextureView(canvas.width, canvas.height);
        const sceneBuffer = utility.getFloat32Buffer("uniform", scene);
        const chaserBuffer = utility.getFloat32Buffer("storage", chaserValues);
        const valueBuffer = utility.getFloat32Buffer("storage", canvas.width * canvas.height * 4);
        const bindings: ComputeShaderRunner.Binding[] = [colourBufferView, sceneBuffer, chaserBuffer, valueBuffer];

        this.writeSceneValue = (index: number, ...values: number[]) =>
            device.queue.writeBuffer(sceneBuffer.buffer, index, new Float32Array(values));

        // Shader Handlers
        const background_computer = new ComputeShaderRunner(device, compute_kernel, "fade_values", bindings);
        const chaser_computer = new ComputeShaderRunner(device, compute_kernel, "update_and_draw_points", bindings);
        const draw_computer = new ComputeShaderRunner(device, compute_kernel, "draw_to_texture", bindings);
        const texturer = new TextureRendererShader(device, colourBufferView.view, () =>
            context.getCurrentTexture().createView()
        );
        this.runner = utility.getCommandRunner([
            background_computer.runner(canvas.width, canvas.height),
            chaser_computer.runner(thousands, 1000),
            draw_computer.runner(canvas.width, canvas.height),
            texturer.renderer,
        ]);
    }

    render = (dt: number) => {
        this.writeSceneValue(0, dt);
        this.runner();
    };

    setAcceleration = (value: number) => this.writeSceneValue(16, value);
    setVelocity = (value: number) => this.writeSceneValue(20, value);
    setSensor = (value: number) => this.writeSceneValue(24, value);
    setRange = (value: number) => this.writeSceneValue(28, value);
    setHalflife = (value: number) => this.writeSceneValue(32, value);
}
