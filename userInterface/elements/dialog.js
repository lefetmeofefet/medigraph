import {HTMElement} from "../libs/htmel.min.js"


customElements.define("x-dialog", class extends HTMElement {
    constructor() {
        super({
            open: false,
        })

        // document.addEventListener(
        //     "click",
        //     e => {
        //         if (!this.contains(e.target) && this.state.open) {
        //             this.close()
        //         }
        //     },
        //     {
        //         capture: false
        //     }
        // )
    }

    render() {
        return this.html(this.state)`
${() => this.state.open && this.html(this.state)`
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
        color: #bbbbbb;
    }
    
</style>
<slot></slot>
`}
            `
    }

    open(anchor, shouldPopIntoScreen) {
        this.state.position = anchor.x != null ?
            {
                x: anchor.x,
                y: anchor.y
            } : {
                x: anchor.offsetLeft,
                y: anchor.offsetTop
            };


        this.state.open = true;

        if (shouldPopIntoScreen) {
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
    }

    close() {
        this.state.open = false;
    }
});