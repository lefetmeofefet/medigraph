import {HTMElement} from "../libs/htmel.min.js"


customElements.define("x-icon", class extends HTMElement {
    render() {
        //language=HTML
        return this.html(this.props)`
            <link rel="stylesheet" href="https://kit-free.fontawesome.com/releases/latest/css/free.min.css" media="all">
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
            
            <i class="${() => this.props.icon}"></i>
        `
    }
});