import {PixiCanvas} from "./pixiCanvas.js";
import {Input} from "./systems/input.js";
import {NavigationMobile} from "./systems/navigation/navigationMobile.js";
import {NavigationDesktop} from "./systems/navigation/navigationDesktop.js";
import {GraphSystem} from "./systems/graph/graphSystem.js";
import {NodeInteraction} from "./systems/nodeInteraction.js";

function create_graph(anchor, graph) {
    let pixiCanvas = new PixiCanvas(0x141414);

    let setup = () => {
        let systems = getSystems(pixiCanvas, graph);
        pixiCanvas.startRenderLoop(delte => {
            for (let system of systems) {
                system.run();
            }
        });
    };

    // PIXI.loader
    PIXI.Loader.shared
        .add("Roboto", "graphshroom/res/font/roboto-bitmap.fnt")
        .on("progress", e => console.log("Progress: ", e))
        .load(setup);
}

function getSystems(pixiCanvas, graph) {
    let inputSystem = new Input(
        () => pixiCanvas.stage.scale,
        () => pixiCanvas.stage.pivot,
        () => pixiCanvas.renderer.plugins.interaction.mouse.global,
        (event, cb) => pixiCanvas.renderer.plugins.interaction.on(event, cb)
    );
    let navigationSystem = window.IsMobile ?
        new NavigationMobile(
            pivot => pixiCanvas.setPivot(pivot.x, pivot.y),
            scale => pixiCanvas.setScale(scale, scale),
            () => ({x: pixiCanvas.renderer.screen.width, y: pixiCanvas.renderer.screen.height}),
            () => pixiCanvas.stage.pivot,
            inputSystem,
            0.03,
            1
        )
        :
        new NavigationDesktop(
            pivot => pixiCanvas.setPivot(pivot.x, pivot.y),
            scale => pixiCanvas.setScale(scale, scale),
            () => ({x: pixiCanvas.renderer.screen.width, y: pixiCanvas.renderer.screen.height}),
            () => pixiCanvas.stage.pivot,
            inputSystem,
            0.03,
            1
        );

    let graphSystem = new GraphSystem(
        pixiCanvas,
        graph
    );

    let nodeInteractionSystem = new NodeInteraction(inputSystem, graphSystem);

    return [
        inputSystem,
        navigationSystem,
        graphSystem,
        nodeInteractionSystem
    ];
}

export {create_graph}