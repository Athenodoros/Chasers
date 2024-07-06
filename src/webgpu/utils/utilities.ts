export const setCanvasDimensions = (
    canvas: HTMLCanvasElement,
    width: number = window.innerWidth,
    height: number = window.innerHeight
): void => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
};
