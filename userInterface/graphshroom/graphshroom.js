import {PixiCanvas} from "./pixiCanvas.js";
import {Input} from "./systems/input.js";
import {NavigationMobile} from "./systems/navigation/navigationMobile.js";
import {NavigationDesktop} from "./systems/navigation/navigationDesktop.js";
import {GraphSystem} from "./systems/graph/graphSystem.js";
import {NodeInteraction} from "./systems/nodeInteraction.js";
import {Forces} from "./systems/physics/forces.js";
import {EntityHider} from "./systems/entityHider.js";

function create_graph(anchor, graph, {onLoadPixi, onLoadSystems, onHover, onHoverOut, onClick, onFinishDrag, onRightClick}) {
    let pixiCanvas = new PixiCanvas(0x141414);

    let setup = updatedGraph => {
        if (updatedGraph != null) {
            graph = updatedGraph
        }
        let systems = getSystems(pixiCanvas, graph,
            {onLoadSystems, onHover, onHoverOut, onClick, onFinishDrag, onRightClick});
        pixiCanvas.startRenderLoop(delta => {
            for (let system of systems) {
                system.run();
            }
        });
    };

    // PIXI.loader
    PIXI.Loader.shared
        .add("Roboto", "userInterface/graphshroom/res/font/roboto-bitmap.fnt")
        .on("progress", e => console.log("Progress: ", e))
        // .load(setup);
        .load(() => onLoadPixi((...args) => setup(...args)));
}

function getSystems(pixiCanvas, graph, {onLoadSystems, onHover, onHoverOut, onClick, onFinishDrag, onRightClick}) {
    let inputSystem = new Input(
        () => pixiCanvas.stage.scale,
        () => pixiCanvas.stage.pivot,
        () => pixiCanvas.renderer.plugins.interaction.mouse.global,
        (event, cb) => pixiCanvas.renderer.plugins.interaction.on(event, cb)
    );

    let graphSystem = new GraphSystem(
        pixiCanvas,
        graph
    );
    onLoadSystems(graphSystem);

    let nodeInteractionSystem = new NodeInteraction(inputSystem, graphSystem, onHover, onHoverOut, onClick, onFinishDrag, onRightClick);

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
            1,
            nodeInteractionSystem
        );

    let edgeForcesSystem = new Forces(graphSystem, nodeInteractionSystem);
    let entityHiderSystem = new EntityHider(pixiCanvas, graphSystem);

    window._NavigationSystem = navigationSystem
    return [
        inputSystem,
        nodeInteractionSystem,
        navigationSystem,
        graphSystem,

        edgeForcesSystem,

        // entityHiderSystem
    ];
}

export {create_graph}