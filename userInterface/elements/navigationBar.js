import {HTMElement} from "../libs/htmel.min.js"
import "./text-input.js"
import "./dialog.js"
import "./x-icon.js"
import "./x-button.js"
import {Vector} from "../graphshroom/physics/vector.mjs";

let EdgeTypes = [
    {
        type: "component",
        hidden: false
    }, {
        type: "product",
        hidden: false
    }, {
        type: "reactant",
        hidden: false
    }, {
        type: "1 hop",
        hidden: false
    }, {
        type: "2 hops",
        hidden: false
    }
]
let SelectedEdgeType = null // TODO: USE THIS BroORORoRR

let SelectedPathOption = {
    name: "Related Nodes",
    selected: true,
}
let PathOptions = [
    SelectedPathOption, // RelatedNodes
    {
        name: "Shortest Path",
        selected: false,
    }, {
        name: "Affecting Nodes",
        selected: false,
    }, {
        name: "Impacted Nodes",
        selected: false,
    }, {
        name: "Paths Between",
        selected: false,
    }];


function toColor(num) {
    num >>>= 0;
    let b = num & 0xFF,
        g = (num & 0xFF00) >>> 8,
        r = (num & 0xFF0000) >>> 16
    return "rgba(" + [r, g, b].join(",") + ")";
}

customElements.define("navigation-bar", class extends HTMElement {
    constructor() {
        super({
            suggestedNodes: [],
        });

        window.zoom = node => this.zoomOnNode(node)
    }

    render() {
        return this.html(this.state)`
<style>
    :host {
        position: fixed;
        width: -webkit-fill-available;
        height: 60px;
        z-index: 1;
        top: 0;
        left: 0;
        display: flex;
        align-items: center;
        background-color: #222222;
        box-shadow: 1px 1px 5px 0px #000000c2;
        color: #bbbbbb;
        padding: 0 20px;
    }
    
    #dropdown {
        max-width: 95%;
    }
    
    #dropdown > .item {
        display: flex;
        cursor: pointer;
        padding: 10px 15px;
    }
    
    .item:hover {
        background-color: #ffffff10
    }
    
    #dropdown > .item > .type-circle {
        border-radius: 100px;
        margin: 5px 10px 5px 0;
        width: 15px;
        min-width: 15px;
        height: 15px;
    }
    
    .filterDialog > .item {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 10px 15px;
    }
    
    .filterDialog > .item > .type-circle {
        border-radius: 100px;
        width: 20px;
        min-width: 20px;
        height: 20px; 
    }
    
    .title-button:first-of-type {
        margin-left: auto;
        margin-right: 10px;
    }
    
    .title-button {
        margin-right: 10px;
        background-color: #272727;
    }
    
    #filterPathsDialog > .item > .radio-button {
        border-radius: 40px;
        margin: 5px 10px 5px 0;
        width: 10px;
        min-width: 10px;
        height: 10px;
        color: green;
    }
    
    #filterPathsDialog > #node-buttons > x-button {
        margin: 10px;
        background-color: #303030;
    }
    
</style>

<text-input id="search" 
            placeholder="search nodes"
            onkeydown=${() => e => e.stopPropagation()}
            keydown=${() => e => this.keyDown(e)}
            submitted=${() => () => {
            this.zoomOnNode(this.state.suggestedNodes[0]);
            this.shadowRoot.querySelector("#dropdown").close()
        }}
            focus=${() => () => {
            let input = this.shadowRoot.querySelector("#search");
            let dropdown = this.shadowRoot.querySelector("#dropdown");
            if (input.value !== "") {
                console.log("FOcus")
                dropdown.open({
                    x: input.offsetLeft,
                    y: input.offsetTop + input.offsetHeight + 5
                })
            }
        }}
            blur=${() => () => {
            requestAnimationFrame(() => this.shadowRoot.querySelector("#dropdown").close());
        }}></text-input>

<x-dialog id="dropdown">
    ${() => this.state.suggestedNodes.map(node => this.html()`
    <div class="item" onmousedown=${() => () => this.zoomOnNode(node)}>
        <div class="type-circle" style="background-color: ${() => toColor(node.color)};"></div>
        <div class="name">${() => this.highlightPartialText(node.name)}</div>
    </div>
    `)}
</x-dialog>

</div>

<x-button id="csvButton"
          class="title-button"
          onclick=${() => () => window.csvReferenceRelationships()}
          >
          CSV
</x-button>

<x-button id="filterPathsButton"
          class="title-button"
          tabindex="0"
          onclick=${() => () => this.toggleFilterDialog(
            this.shadowRoot.querySelector("#filterPathsDialog"),
            this.shadowRoot.querySelector("#filterPathsButton")
        )}
          onblur=${() => () => this.shadowRoot.querySelector("#filterPathsDialog").close()}>
Paths

    <x-dialog id="filterPathsDialog"
              class="filterDialog" 
              onclick=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmousedown=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onhover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmouseover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmousein=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
          >
        ${() => PathOptions.map(pathOption => this.html(pathOption)`
        <div class="item" 
             onmousedown=${() => () => this.pathOptionClicked(pathOption)}>
            <div class="radio-button" style="
                background-color: ${() => pathOption.selected ? "green" : "#00000000"};
                border: 3px solid ${() => pathOption.selected ? "green" : "grey"};
            "></div>
            <div>${() => pathOption.name}</div>
        </div>
        `)}
        <div id="node-buttons">
            <x-button id="hide-nodes" onclick=${() => () => window.hideFadedNodes()}>Hide Faded Nodes</x-button>
            <x-button id="reset-nodes" onclick=${() => () => window.resetHiddenNodes()}>Reset Nodes</x-button>
        </div>
    </x-dialog>

</x-button>

<x-button id="filterNodesButton"
          class="title-button"
          tabindex="0" 
          onclick=${() => () => this.toggleFilterDialog(
            this.shadowRoot.querySelector("#filterNodesDialog"),
            this.shadowRoot.querySelector("#filterNodesButton")
        )}
          onblur=${() => () => this.shadowRoot.querySelector("#filterNodesDialog").close()}>
    Nodes
    <x-dialog id="filterNodesDialog"
              class="filterDialog" 
              onclick=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmousedown=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onhover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmouseover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmousein=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
          >
        ${() => [window.DefaultColor, ...window.NodeColors].map(colorMapping => this.html(colorMapping)`
        <div class="item" 
             onmousedown=${() => () => this.colorMappingClicked(colorMapping)}
             title=${() => colorMapping.types.join(", ")}>
            <div class="type-circle" style="
                background-color: ${() => colorMapping.filtered ? "#00000000" : (toColor(colorMapping.color))};
                border: 5px solid ${() => toColor(colorMapping.color)};
            "></div>
        </div>
        `)}
    </x-dialog>
</x-button>

<x-button id="filterEdgesButton"
          class="title-button"
          tabindex="0" 
          onclick=${() => () => this.toggleFilterDialog(
            this.shadowRoot.querySelector("#filterEdgesDialog"),
            this.shadowRoot.querySelector("#filterEdgesButton"),
            true
        )}
          onblur=${() => () => this.shadowRoot.querySelector("#filterEdgesDialog").close()}>
    Edges
    <x-dialog id="filterEdgesDialog" 
              class="filterDialog"
              onclick=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmousedown=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onhover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmouseover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
              onmousein=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
          >
        ${() => EdgeTypes.map(edgeType => this.html(edgeType)`
        <div class="item" 
             onmousedown=${() => () => this.filterEdgeTypeClicked(edgeType)}>
            <div style="opacity: ${() => edgeType.hidden ? "0.3" : "1"};">${() => edgeType.type}</div>
        </div>
        `)}
    </x-dialog>
</x-button>


`
    }

    highlightPartialText(text) {
        let input = this.shadowRoot.querySelector("#search");
        let partial = input.value;
        let startIndex = text.toLowerCase().indexOf(partial.toLowerCase());
        return this.html()`
        <div style="display: flex; word-spacing: 0;">
            <div>${text.substring(0, startIndex)}</div>
            <div style="font-weight: bold; color: white;">
                ${text.substring(startIndex, startIndex + partial.length)}
            </div>
            <div>${text.substring(startIndex + partial.length)}</div>
        </div>
        `
    }

    keyDown(e) {
        if (e.key === 'Enter') {
            return
        }
        let input = this.shadowRoot.querySelector("#search");

        requestAnimationFrame(() => {
            let text = input.value;
            let dropdown = this.shadowRoot.querySelector("#dropdown");
            if (text === "") {
                dropdown.close();
            } else {
                let suggestedNodes = [];
                for (let node of graphSystem.nodes) {
                    if (node.name.toLowerCase().indexOf(text.toLowerCase()) !== -1) {
                        suggestedNodes.push(node)
                    }
                }

                this.state.suggestedNodes = suggestedNodes;

                dropdown.open({
                    x: input.offsetLeft,
                    y: input.offsetTop + input.offsetHeight + 5
                });
            }
        })
    }

    zoomOnNode(node) {
        window._NavigationSystem._zoomPoint = {
            x: node.position.x,
            y: node.position.y
        };

        function repeat(times, interval, cb, finishCb) {
            if (times === 0) {
                finishCb && finishCb();
                return
            }
            setTimeout(() => {
                cb();
                repeat(times - 1, interval, cb, finishCb)
            }, interval)
        }

        repeat(12, 33, () => {
            window._NavigationSystem._scaleDestination = (window._NavigationSystem._scaleDestination + 0.1) / 2;
        }, () => {
            let nodePosition = {
                x: node.position.x,
                y: node.position.y
            };
            window._NavigationSystem._zoomPoint = Vector.Plus(
                nodePosition,
                Vector.Multiply(
                    Vector.Minus(nodePosition, window._NavigationSystem.center),
                    0.135
                )
            );

            repeat(20, 33, () => {
                let diff = 1 - window._NavigationSystem._scaleDestination
                window._NavigationSystem._scaleDestination += diff / 10
            })
        })
    }

    toggleFilterDialog(dialog, button, shouldPopIntoScreen) {
        if (dialog.state.open) {
            dialog.close();
        } else {
            dialog.open({
                x: button.offsetLeft,
                y: button.offsetTop + button.offsetHeight + 5
            }, shouldPopIntoScreen);
        }
    }

    colorMappingClicked(colorMapping) {
        colorMapping.filtered = !colorMapping.filtered;
        for (let node of window.graphSystem.nodes) {
            if (node.originalNodeRef._colorObject === colorMapping) {
                if (colorMapping.filtered) {
                    node.hide();
                } else {
                    node.show();
                }
            }
        }
        window.updatePathSearch()
    }

    filterEdgeTypeClicked(edgeType) {
        edgeType.hidden = !edgeType.hidden;
        for (let edge of window.graphSystem.edges) {
            if (edge.description === edgeType.type) {
                if (edgeType.hidden) {
                    edge.hide();
                } else {
                    if (!edge.sourceNode.hidden && !edge.destinationNode.hidden) {
                        edge.show();
                    }
                }
            }
        }
    }

    pathOptionClicked(pathOption) {
        SelectedPathOption.selected = false;
        SelectedPathOption = pathOption;
        SelectedPathOption.selected = true;
        SearchOptions.PathOption = SelectedPathOption.name
        window.updatePathSearch()
    }
});