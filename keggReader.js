import fetch from "node-fetch"

const MAPK_PATHWAY_URL = "https://www.kegg.jp/kegg-bin/download?entry=ko04010&format=kgml"

fetch(MAPK_PATHWAY_URL)
    .then(res => res.text())
    .then(body => console.log(body));