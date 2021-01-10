import {BiochemicalEntity} from "../BiochemicalEntity.js";

class EntityInstance extends BiochemicalEntity {
    cellularLocation;

    constructor(props, cellularLocation) {
        super(props);
        this.cellularLocation = cellularLocation
    }
}

export {EntityInstance}