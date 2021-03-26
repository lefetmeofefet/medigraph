import {HTMElement} from "../libs/htmel.min.js"


customElements.define("text-input", class extends HTMElement {
    render() {
        //language=HTML
        return this.html()`
            <div style="width: inherit">
                <style>
                    :host {
                        display: flex;
                    }
                    
                    input {
                        width: inherit;
                        border: none;
                        outline: none;
                        
                        padding: 12px 24px;
                        background-color: rgba(0, 0, 0, 0.1);
                        font-size: 18px;
                        border-radius: 100px;
                        caret-color: #606060;
                        color: inherit;
                    }
                    
                    /* Chrome, Safari, Edge, Opera */
                    input::-webkit-outer-spin-button,
                    input::-webkit-inner-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                    }
                    
                    /* Firefox */
                    input[type=number] {
                      -moz-appearance: textfield;
                    }
                </style>
                <input type="${() => this.props.type}"
                       placeholder="${() => this.props.placeholder}"
                       onchange=${() => this.props.changed && this.props.changed()}
                       onkeyup=${() => this.props.keyup && this.props.keyup()}
                       onkeydown=${e => this.props.keydown && this.props.keydown(e)}
                       onfocus=${() => this.props.focus && this.props.focus()}
                       onblur=${() => this.props.blur && this.props.blur()}
                       onkeypress=${e => {
            if (e.key === 'Enter') {
                this.props.submitted()
            }
            this.props.keydown && this.props.keydown(e)
        }}
                >
            </div>
        `
    }

    get value() {
        return this.shadowRoot.querySelector("input").value
    }
})