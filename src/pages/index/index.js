const corsBypassUrl = 'http://cors-anywhere.herokuapp.com';
const domenUrl = 'nopainstruments.de';
const apiUrl = 'https://api.pstuffapp.com/';

import axios from "axios";
import { flattenDeep } from "lodash";

const siteWrapper = document.getElementById('site-wrapper');

const parseTableRow = (row) => {
    const artikulNode = row.querySelector('td.contListRow > a');
    const otherNodes = row.querySelectorAll('td.contListRowNext');
    const name = otherNodes[0].children[0].innerText;
    const size = otherNodes[1].innerText;
    const form = otherNodes[2].innerText;
    const img = row.querySelectorAll('img')[1].src;
    const formImg = row.querySelectorAll('img')[2].src;
    return ({
        artikul: artikulNode.innerText,
        name: name,
        size: size,
        form: form,
        img: prepareHref(img, true),
        formImg: prepareHref(formImg, true)
    });
};

const prepareHref = (href, replaceDomen = false) => {
    return href.replace(window.location, replaceDomen ? `http://${domenUrl}/` : '')
};

const parsePage = (href) => {
    return axios.get(`${corsBypassUrl}/${domenUrl}/${href}&sNewLID=en`, {
        crossDomain: true,
    })
};

const removeHeadlines = (dom) => {
    const headlines = dom.querySelectorAll('td.contGroupHeadline');
    headlines.forEach(
        function(val) {
            val.closest('table.contMiddle').remove();
        }
    );
};

const parseTable = (htmlString) => {
    let el = document.createElement( 'html' );
    el.innerHTML = `${htmlString}`;
    let rows = el.querySelectorAll('table.contMiddle a.contListRow');
    return ([...rows].map(el => {
        const href = prepareHref(el.href);
        return {
            name: el.innerText,
            href: href
        }
    }))
};

const parseTableGoods = (htmlString) => {
    let el = document.createElement( 'html' );
    el.innerHTML = `${htmlString}`;
    removeHeadlines(el);
    let rows = el.querySelectorAll('table.contMiddle');
    let goods = [];
    rows.forEach(row => goods.push(parseTableRow(row)));
    return goods
};

const compareData = (goods, categories, catalogue) => {
    return catalogue.map((catalogue, catalogueindex) => {
        catalogue.categories = categories[catalogueindex].map((category, categoryindex) => {
            category.goods = goods[catalogueindex][categoryindex];
            return category;
        });
        return catalogue
    })
};

const createDownloadLink = (val, name, className = 'link') => {
    const data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(val));
    let downloadLink = document.createElement( 'span' );
    downloadLink.innerHTML = `<a class="${className}" href="data:${data}" download='${name}.json'>${name}</a>`;
    siteWrapper.appendChild(downloadLink);
};

const createDownloadLink2 = (url, name, className = 'link') => {
    let downloadLink = document.createElement( 'span' );
    downloadLink.innerHTML = `<a class="${className}" href="${url}" download='${name}.json' target="_blank">${name}</a>`;
    siteWrapper.appendChild(downloadLink);
};

document.addEventListener("DOMContentLoaded", function () {
    const parseCatalogPage = (url) => {
        return parsePage(`${url.href}&sNewLID=en`)
            .then(response => response.data)
            .then(htmlString => {
                let catalogue = parseTable(htmlString);

                const grabContent = (url, isGoods = false) => parsePage(url)
                    .then(response => response.data)
                    .then(htmlString => isGoods ? parseTableGoods(htmlString) : parseTable(htmlString));

                return Promise.all(catalogue.map(el => grabContent(el.href)))
                    .then(categories => {
                        let requests = [];
                        categories.forEach(category => {
                            requests.push(Promise.all(category.map(el => grabContent(el.href, true))));
                        });
                        return Promise.all(requests)
                            .then(goods => {
                                const treeView = compareData(goods, categories, catalogue);
                                createDownloadLink(treeView, url.name);
                                return goods
                            });
                    })

            })
    };

    const catalogs = [
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_1', name:'A-K - General Instruments'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_2', name:'ENT / Plastic Surgery Head'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_15', name:'GYN - OBS- URO'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_3', name:'Plastic Surgery 2 Body'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_4', name:'KK - Cardiovascular'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_5', name:'KP - Ophthalmology'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_6', name:'KS - Neurosurgery'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_7', name:'X - Endoscopy'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_8', name:'Container E-System'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_9', name:'Dental amd Oral'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_10', name:'Rectum'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_11', name:'Podiatry'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_12', name:'0-Linie'},
        {href: '/produkte/index.php?template=navListe&iLevel=3&sRefLevel=1_13', name:'Various Items'},
    ];

    Promise.all(catalogs.map(el => parseCatalogPage(el)))
        .then(goods => {
            let resultGoods = flattenDeep(goods);
            axios.post(`${apiUrl}/v1/json`, {
                data: JSON.stringify(resultGoods)
            })
            .then(response => createDownloadLink2(response.data, 'all goods'))
        });
});
