// import { CanvasSimulation } from "./canvas";
import "./style.css";
import { runSimulationInLoop } from "./utils/runner";
import { WebGPUSimulation } from "./webgpu";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// const simulation = new CanvasSimulation(2000, canvas);
WebGPUSimulation.from(canvas)
    .then((simulation) => {
        runSimulationInLoop(simulation);
        (window as any).simulation = simulation;
    })
    .catch(() => {
        const message = document.createElement("h4");
        message.innerText =
            "This app does not work without Web GPU - try running Chrome Canary or Firefox Nightly, and enabling Web GPU";
        canvas.parentElement?.appendChild(message);
    });
