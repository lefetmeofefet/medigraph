import _pgp from 'pg-promise'

let pgp = _pgp();

const DB_CONNECTION_DETAILS = {
    host: 'kandula.db.elephantsql.com',
    database: 'djegpfnq',
    user: 'djegpfnq',
    password: 'XaTXzvG4cJj72RnPDF8-9ALmS8EJZt3w',
    port: 5432,
    max: 4
};

const db = pgp(DB_CONNECTION_DETAILS)

const MedigraphDb = new class {
    async _createPathway({name, source}) {
        const result = await db.oneOrNone({
            name: "create-pathway",
            text: `
                INSERT INTO source_raw.pathways (name, source)
                SELECT $1,
                       source_raw.sources.id
                from source_raw.sources
                where source_raw.sources.name = $2
                RETURNING source_raw.pathways.id
            `,
            values: [name, source]
        });
        return result.id
    }

    async _createNode({type, data, pathwayId, name}) {
        const result = await db.one({
            name: "create-node",
            text: `
                INSERT INTO source_raw.nodes (type, data, pathway, name)
                values ($1, $2, $3, $4)
                RETURNING source_raw.nodes.id
            `,
            values: [type, data, pathwayId, name]
        });
        return result.id
    }

    async _createEdge({source, destination, description, data}) {
        await db.oneOrNone({
            name: "create-edge",
            text: `
                INSERT INTO source_raw.edges (source, destination, description, data)
                values ($1, $2, $3, $4)
                RETURNING id
            `,
            values: [source, destination, description, data]
        })
    }

    async savePathway({pathway, nodes, edges}) {
        let pathwayId = await this._createPathway(pathway)

        let idToDbId = new Map();
        for (let node of nodes) {
            let dbId = await this._createNode({
                type: node.type,
                data: node.data,
                pathwayId: pathwayId,
                name: node.name
            });
            idToDbId.set(node.id, dbId)
        }

        for (let edge of edges) {
            await this._createEdge({
                source: idToDbId.get(edge.source),
                destination: idToDbId.get(edge.destination),
                description: edge.description,
                data: edge.data,
            })
        }
    }

    async getPathway(name) {
        let nodes = await db.many({
            name: "get-nodes",
            text: `
                SELECT nodes.*
                from source_raw.pathways
                         inner join source_raw.nodes on pathways.id = nodes.pathway
                where pathways.name = $1
            `,
            values: [name]
        });

        let edges = await db.many({
            name: "get-edges",
            text: `
                SELECT distinct on (edges.id) edges.*
                from source_raw.pathways
                         inner join source_raw.nodes on pathways.id = nodes.pathway
                         inner join source_raw.edges on (nodes.id = edges.destination or nodes.id = edges.source)
                where pathways.name = $1
            `,
            values: [name]
        });

        return {nodes, edges}
    }
}

export {MedigraphDb}