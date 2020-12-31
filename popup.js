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
            () => this.close(),
            {
                capture: false
            }
        )
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
        pointer-events: none;
        background-color: #222222;
        border-radius: 4px;
        box-shadow: 1px 1px 5px 0px #000000c2;
        padding: 20px;
        color: #bbbbbb;
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
    }
    
    #body > .row {
        display: flex;
        margin-top: 10px;
    }
    
    #body > .row > .field-name {
        display: flex;
        width: 130px;
        min-width: 130px;
        opacity: 0.8;
    }
    
    #body > .row > .field-value {
        display: flex;
        max-width: 300px;
    }
</style>

<div>
    <div id="title">
        ${() => this.state.data.name}
    </div>
    <div id="body">
        <div class="row">
            <div class="field-name">Type</div>
            <div class="field-value">${() => this.state.data.type}</div>
        </div>
        <div class="row">
            <div class="field-name">Other Names</div>
            <div class="field-value">${() => this.state.data.otherNames.toString()}</div>
        </div>
        <div class="row">
            <div class="field-name">Location</div>
            <div class="field-value">${() => this.state.data.cellularLocation != null &&
            this.state.data.cellularLocation.toString()}</div>
        </div>
        <div class="row">
            <div class="field-name">Component Stoichiometry</div>
            <div class="field-value">${() => JSON.stringify(this.state.data.componentStoichiometry, null, 1)}</div>
        </div>
        <div class="row">
            <div class="field-name">Participant Stoichiometry</div>
            <div class="field-value">${() => JSON.stringify(this.state.data.participantStoichiometry, null, 1)}</div>
        </div>
        <div class="row">
            <div class="field-name">Other DBs</div>
            <div class="field-value" style="display: flex; flex-direction: column;">
                ${() => this.state.data.unificationRefs != null && this.state.data.unificationRefs.map(ref => this.html(ref)`
                <div>
                    ${() => ref.db}: ${() => ref.id}
                </div>
                `)}
            </div>
        </div>
    </div>
</div>
`}
            `
    }

    popup(node) {
        this.state.position = {
            x: mouseLocation.x,
            y: mouseLocation.y,
        };
        this.state.open = true;

        let res = node.originalNodeRef.originalResource;
        let namesList = new Set();
        if (res.hasOwnProperty("bp:name")) {
            res["bp:name"].forEach(name => namesList.add(name["_"]))
        }
        if (res.hasOwnProperty("bp:displayName")) {
            res["bp:displayName"].forEach(name => namesList.add(name["_"]))
        }
        if (res.hasOwnProperty("entityReference")) {
            let ref = res["entityReference"][0];
            if (ref.hasOwnProperty("bp:name")) {
                ref["bp:name"].forEach(name => namesList.add(name["_"]))
            }
            if (ref.hasOwnProperty("bp:displayName")) {
                ref["bp:displayName"].forEach(name => namesList.add(name["_"]))
            }
        }

        this.state.data = {
            name: node.name,
            otherNames: [...namesList],
            type: node.originalNodeRef.type.substr(3),
            controlType: res.hasOwnProperty("bp:controlType") ? res["bp:controlType"][0]["_"] : "",
            cellularLocation: res.cellularLocation == null ? "" : res.cellularLocation[0]["bp:term"][0]["_"],
            componentStoichiometry: res.componentStoichiometry == null ?
                [] : res.componentStoichiometry.map(
                    stoich => ({
                        coefficient: stoich.stoichiometricCoefficient,
                        physicalEntity: stoich.physicalEntity.hasOwnProperty("bp:name") ?
                            stoich.physicalEntity["bp:name"][0]["_"] : (
                                stoich.physicalEntity.hasOwnProperty("bp:displayName") ?
                                    stoich.physicalEntity["bp:displayName"][0]["_"] : "UNKNOWN (FIX THIS)"
                            )
                    })
                ),
            participantStoichiometry: res.participantStoichiometry == null ?
                [] : res.participantStoichiometry.map(
                    stoich => ({
                        coefficient: stoich.stoichiometricCoefficient,
                        physicalEntity: stoich.physicalEntity.hasOwnProperty("bp:name") ?
                            stoich.physicalEntity["bp:name"][0]["_"] : (
                                stoich.physicalEntity.hasOwnProperty("bp:displayName") ?
                                    stoich.physicalEntity["bp:displayName"][0]["_"] : "UNKNOWN (FIX THIS)"
                            )
                    })
                ),
            unificationRefs: node.originalNodeRef.unificationRefs,
        };
    }

    close() {
        this.state.open = false;
    }
});