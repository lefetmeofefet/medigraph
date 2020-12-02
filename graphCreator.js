import puppeteer from "puppeteer";

let DRUG_BANK_DRUGS = [
    "DB01053", // Benzylpenicilin
    "DB01050", // Ibuprofen
]

async function start() {
    let graph = {
        nodes: [],
        edges: []
    };
    let browser = await puppeteer.launch();
    try {
        let page = await browser.newPage();
        let drugs = [];
        for (let drugId of DRUG_BANK_DRUGS) {
            await page.goto(`https://go.drugbank.com/drugs/${drugId}`);
            let drug = await page.evaluate(() => {
                let bonds = document.querySelectorAll(".bond");
                bonds = [...bonds].map(bond => ({
                    name: bond.querySelector(".card-header > strong > a").innerText,
                    kind: bond.querySelector("#kind + dd").innerText,
                    organism: bond.querySelector("#organism + dd").innerText,
                    pharmacologicalAction: bond.querySelector("#pharmacological-action + dd").innerText,
                    actions: [...(bond.querySelectorAll("#actions + dd > div"))].map(action => action.innerText),
                    geneName: bond.querySelector("#gene-name + dd").innerText,
                    uniprotId: bond.querySelector("#uniprot-id + dd").innerText,
                }));
                return {
                    relationships: bonds,
                    name: document.querySelector("div.content-header > h1").innerText
                }
            });
            drugs.push(drug);

            for (let relationship of drug.relationships) {
                await page.goto(`https://www.ebi.ac.uk/QuickGO/annotations?geneProductId=${relationship.uniprotId}`);
                await page.waitForSelector(".results-table")
                relationship.quickGoRelationships = await page.evaluate(() => {
                    let bonds = document.querySelectorAll(".results-table > tbody > tr");
                    return [...bonds].map(bond => ({
                        qualifier: bond.querySelector(":nth-child(3)").innerText,
                        name: (
                            bond.querySelector(":nth-child(5) > term-line > div.term-line-description > span") ||
                            bond.querySelector(":nth-child(5)")
                        ).innerText,
                    })).filter(bond => bond.qualifier !== "part_of")
                });
            }
        }

        let color = 0x2d8732
        let y = 100;
        let y2 = 100;
        let y3 = 100;
        let drugBankNodes = new Map();
        let quickGoNodes = new Map();
        for (let drug of drugs) {
            graph.nodes.push({
                name: drug.name,
                position: {x: 100, y: y},
                color: color
            });
            y += 1000;
            for (let drugBankRelationship of drug.relationships) {
                if (!drugBankNodes.has(drugBankRelationship.name)) {
                    let newNode = {
                        name: drugBankRelationship.name,
                        position: {x: 1000, y: y2},
                        color: color
                    }
                    y2 += 500;
                    graph.nodes.push(newNode);
                    drugBankNodes.set(drugBankRelationship.name, newNode)
                }

                graph.edges.push({
                    source: drug.name,
                    destination: drugBankRelationship.name,
                    action: drugBankRelationship.actions.toString()
                })

                for (let quickGoRelationship of drugBankRelationship.quickGoRelationships) {
                    if (!quickGoNodes.has(quickGoRelationship.name)) {
                        let newNode = {
                            name: quickGoRelationship.name,
                            position: {x: 1900, y: y3},
                            color: color
                        }
                        y3 += 100;
                        graph.nodes.push(newNode);
                        quickGoNodes.set(quickGoRelationship.name, newNode)
                    }

                    graph.edges.push({
                        source: drugBankRelationship.name,
                        destination: quickGoRelationship.name,
                        action: quickGoRelationship.qualifier
                    })
                }
            }
        }

        let a = 3
    } finally {
        await browser.close()
    }
}

start()