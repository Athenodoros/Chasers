import { Simulation } from "../utils/runner";
import { Runner, RunnerConfig } from "./runner";
import { setCanvasDimensions } from "./utils/assets";

export class WebGPUSimulation implements Simulation {
    canvas: HTMLCanvasElement;
    controls: HTMLElement[];
    config: RunnerConfig;

    static async from(canvas: HTMLCanvasElement, config: RunnerConfig = DefaultConfig) {
        setCanvasDimensions(canvas);
        const runner = await Runner.from(canvas, config);
        return new WebGPUSimulation(runner, canvas, config);
    }

    runner: Runner;

    constructor(runner: Runner, canvas: HTMLCanvasElement, config: RunnerConfig) {
        this.runner = runner;
        this.canvas = canvas;
        this.config = config;

        const chasersInputWrapper = document.createElement("div");
        chasersInputWrapper.setAttribute("style", "display: flex");
        const chasersInput = document.createElement("input");
        chasersInput.setAttribute("style", "flex-shrink: 1; min-width: 0;");
        chasersInput.defaultValue = "" + config.thousands;
        const chasersInputButton = document.createElement("button");
        chasersInputButton.innerText = "Restart";
        chasersInputButton.onclick = () => {
            const newThousands = Number(chasersInput.value || config.thousands);
            if (newThousands && !isNaN(newThousands)) {
                this.config.thousands = newThousands;
                this.restart();
            }
        };
        chasersInputWrapper.append(chasersInput, chasersInputButton);

        this.controls = [
            chasersInputWrapper,
            getNumericController("Acceleration", config.acceleration, (value) => {
                this.config.acceleration = value;
                this.runner.setAcceleration(value);
            }),
            getNumericController("Velocity", config.velocity, (value) => {
                this.config.velocity = value;
                this.runner.setVelocity(value);
            }),
            getNumericController("Sensor", config.sensor, (value) => {
                this.config.sensor = value;
                this.runner.setSensor(value);
            }),
            getNumericController("Range", config.range, (value) => {
                this.config.range = value;
                this.runner.setRange(value);
            }),
            getNumericController("Halflife", config.halflife, (value) => {
                this.config.halflife = value;
                this.runner.setHalflife(value);
            }),
        ];
    }

    update(dt: number) {
        this.runner.render(dt);
    }

    restart() {
        Runner.from(this.canvas, this.config).then((runner) => (this.runner = runner));
    }
}

const DefaultConfig: RunnerConfig = {
    thousands: 400,
    acceleration: 3,
    velocity: 200,
    sensor: 10,
    range: 2,
    halflife: 0.1,
};

const getNumericController = (name: string, value: number, useValue: (updated: number) => void) => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("style", "display: flex");
    const title = document.createElement("p");
    title.setAttribute("style", "flex-grow: 1; margin: 0");
    title.innerText = name + ":";
    const input = document.createElement("input");
    input.setAttribute("style", "width: 30px; text-align: right;");
    input.defaultValue = "" + value;
    const update = () => {
        const value = Number(input.value);
        if (!isNaN(value)) useValue(value);
    };
    input.onblur = update;
    input.onkeydown = (event) => {
        if (event.code === "Enter") update();
    };

    wrapper.append(title, input);
    return wrapper;
};
