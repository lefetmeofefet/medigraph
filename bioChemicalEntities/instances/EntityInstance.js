import {BiochemicalEntity} from "../BiochemicalEntity.js";

class EntityInstance extends BiochemicalEntity {
    location;

    constructor(props, location) {
        super(props);
        this.location = location
    }
}

export {EntityInstance}