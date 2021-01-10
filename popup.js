import {HTMElement} from "./libs/htmel.min.js"

let mouseLocation = {
    x: 0,
    y: 0
}

customElements.define("pop-up", class extends HTMElement {
    constructor() {
        super({
            open: false,
            position: mouseLocation,
            data: null
        })


        document.addEventListener(
            "mousemove",
            event => mouseLocation = {
                x: event.pageX,
                y: event.pageY,
            },
            {
                capture: false
            }
        );

        document.addEventListener(
            "mousedown",
            e => {
                if (!this.contains(e.target) && this.state.open) {
                    this.close()
                }
            },
            {
                capture: false
            }
        )

        this.addEventListener("mouseenter", () => {
           this.isMouseInside = true;
        });
        this.addEventListener("mouseleave", () => {
            // this.close()
        });
    }

    render() {
        return this.html(this.state)`
${() => this.state.data != null && this.state.open && this.html(this.state)`
<style>
    :host {
        position: fixed;
        top: ${() => this.state.position.y}px;
        left: ${() => this.state.position.x}px;
        display: flex;
        flex-direction: column;
        z-index: 1;
        background-color: #222222;
        border-radius: 4px;
        box-shadow: 1px 1px 5px 0px #000000c2;
        padding: 20px;
        color: #bbbbbb;
    }
    
    :host {
        pointer-events: ${() => this.state.data.clickable ? "all" : "none"};
    }
    
    #close-button {
        background-color: #ffffff22;
        border-radius: 100px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        font-size: 18px;
        padding-top: 1px;
        display: flex;
        justify-content: center;
        position: absolute;
        right: 10px;
        top: 10px;
    }
    
    #title {
        font-size: 18px;
        text-decoration: underline;
        margin-bottom: 10px;
    }
    
    #body {
        font-size: 14px;
        display: flex;
        flex-direction: column;
        max-height: 600px;
        overflow-y: auto;
        overflow-x: hidden;
    }
    
    .row {
        display: flex;
        margin-bottom: 10px;
    }
    
    .row > .field-name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        display: block;
        width: 140px;
        min-width: 140px;
        opacity: 0.8;
    }
    
    .row > .field-value {
        display: flex;
        max-width: 300px;
    }
    
    /*.object-container + .object-container {*/
    /*    padding-top: 10px;*/
    /*    border-top: 1px solid grey;*/
    }
</style>

<div id="close-button" onclick=${() => this.close()}>
    x
</div>

<div>
    <div id="title">
        ${() => this.state.data.name}
    </div>
    <div id="body">
        ${() => this.renderJson(this.state.data.json)}
    </div>
</div>
`}
            `
    }

    renderJson(json) {
        return this.html()`
        <div class="object-container">
            ${() => {
            let render = [];
            for (let [key, value] of Object.entries(json)) {
                if (["name"].includes(key)) {
                    continue
                }

                if (value instanceof Array) {
                    value = value.map(item => {
                        if (item instanceof Object) {
                            return this.renderJson(item)
                        }
                        return item.toString()
                    });
                    if (value.length === 0) {
                        value = "[]"
                    }
                } else if (value instanceof Object) {
                    if (value.displayType === "link") {
                        value = this.html()`<a target="_blank" href="${value.link}">${value.name}</a>`
                    } else {
                        value = this.renderJson(value)
                    }
                } else if (value == null) {
                    value = ""
                } else {
                    value = value.toString()
                }
                if (render)
                    render.push(this.html()`
                    <div class="row">
                        <div class="field-name">${key}</div>
                        <div class="field-value" style="display: flex; flex-direction: column;">${() => value}</div>
                    </div>
                    `)
                }
                return render    
            }}
        </div>
        `
    }

    popup(node) {
        this.state.position = {
            x: mouseLocation.x,
            y: mouseLocation.y,
        };
        this.state.open = true;

        let bioEntity = node.originalNodeRef.bioEntity.getDisplayJson();
        bioEntity.cellularLocation = node.originalNodeRef.cellularLocation

        this.state.data = {
            name: bioEntity.name,
            clickable: node.selected,
            json: bioEntity
        };

        let {width, height} = this.getBoundingClientRect();
        let margin = 10;

        if (this.state.position.x + width + margin > window.innerWidth) {
            this.state.position.x = window.innerWidth - width - margin;
        }
        if (this.state.position.x < margin) {
            this.state.position.x = margin;
        }

        if (this.state.position.y + height + margin > window.innerHeight) {
            this.state.position.y = window.innerHeight - height - margin;
        }
        if (this.state.position.y < margin) {
            this.state.position.y = margin;
        }

        // IMPROTANT
        this.state.position = this.state.position;
    }

    close() {
        this.state.open = false;
        this.isMouseInside = false;
    }
});