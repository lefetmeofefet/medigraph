class SparseEntitiesGrid {
    static get CELL_SIZE() {
        // return 1300;
        return 500;
    }
    constructor() {
        // Map of stringified 2d coordinate -> Set of entities
        // NOTE: There could be same entities across different cells, because these entities are in both cells
        this.grid = new Map();
    }

    /**
     * Adds an entity into the sparse grid.
     * The grid will now have a reference to the entity from the cell that the entity is in, based on (x, y).
     * The entity itself will have a parameter named populatedCell that will contain the cell referencing it.
     * @param entity
     * @param x
     * @param y
     */
    addEntity(entity, x, y) {
        let xIndex = Math.floor(x / SparseEntitiesGrid.CELL_SIZE);
        let yIndex = Math.floor(y / SparseEntitiesGrid.CELL_SIZE);

        // Insert entity into cell
        let entitiesInCell = this.grid.get(xIndex + "," + yIndex);
        if (entitiesInCell) {
            entitiesInCell.push(entity);
        }
        else {
            let newCellContent = [entity];
            this.grid.set(xIndex + "," + yIndex, newCellContent);
        }
        entity.populatedCell = [xIndex, yIndex];
    }

    removeEntity(entity) {
        let entitiesInCell = this.grid.get(entity.populatedCell[0] + "," + entity.populatedCell[1]);
        if (entitiesInCell) {
            // TODO: Decide if i want empty cells to contain an empty array or undefined. memory leak vs performance
            // if (entitiesInCell.size === 1) {
            //     this.grid.delete(entity.populatedCell[0] + "," + entity.populatedCell[1]);
            // }
            // else {
            //     entitiesInCell.splice(entitiesInCell.indexOf(entity), 1);
            // }
            entitiesInCell.splice(entitiesInCell.indexOf(entity), 1);
        }
        entity.populatedCell = null;
    }

    updateEntity(entity, x, y) {
        let xIndex = Math.floor(x / SparseEntitiesGrid.CELL_SIZE);
        let yIndex = Math.floor(y / SparseEntitiesGrid.CELL_SIZE);
        if (xIndex !== entity.populatedCell[0] || yIndex !== entity.populatedCell[1]) {
            this.removeEntity(entity);
            this.addEntity(entity, x, y);
        }
    }

    getEntitiesInCell(x, y) {
        let cellEntities = this.grid.get(Math.floor(x / SparseEntitiesGrid.CELL_SIZE) + "," + Math.floor(y / SparseEntitiesGrid.CELL_SIZE));
        return cellEntities || [];
    }

    getEntitiesInRect(startX, startY, endX, endY) {
        // Array of arrays of entities
        let entityArrays = [];
        let grid = this.grid;

        let maxX = Math.floor(endX / SparseEntitiesGrid.CELL_SIZE);
        let maxY = Math.floor(endY / SparseEntitiesGrid.CELL_SIZE);

        for (let x = Math.floor(startX / SparseEntitiesGrid.CELL_SIZE); x <= maxX; x++) {
            for (let y = Math.floor(startY / SparseEntitiesGrid.CELL_SIZE); y <= maxY; y++) {
                let cellEntities = grid.get(x + "," + y);
                if (cellEntities) {
                    entityArrays.push(cellEntities);
                }
            }
        }
        return [].concat(...entityArrays);
    }
}

export {SparseEntitiesGrid}