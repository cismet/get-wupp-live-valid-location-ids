import fetch from 'node-fetch';
//import convert from 'xml-js';
import fs from 'fs';
import cheerio from 'cheerio';

console.log('started');
let today = new Date();

fetch('https://www.wuppertal-live.de/')
	.then((response) => {
		console.log('response', response.status);

		if (response.status === 200) {
			return response.text();
		} else {
			throw new Error("Server md5 response wasn't OK");
		}
	})
	.then((content) => {
		const $ = cheerio.load(content);
		let data = [];
		let idsOnly = [];
		$('select[name=stage]').children().each((i, item) => {
			if (item.attribs.value && item.attribs.value !== 'nop') {
				let value = item.attribs.value;
				if (!parseInt(item.attribs.value, 10)) {
					console.log('kein integer: ', value);
					value = value.replace('film_', '');
					value = value.replace('O', '0');
				}
				if (idsOnly.indexOf(value) === -1) {
					data.push({ id: value, name: $(item).text() });
					idsOnly.push(value);
				} else {
					//onsole.log('duplictae id', value);
				}
			}
		});
		fs.writeFile(`out/data.json`, JSON.stringify(data, null, 2), 'utf8', () =>
			console.log(`out/data.json geschrieben`)
		);
		let sql = `DELETE FROM poi_wupplive_available_ids;`;
		sql += `INSERT INTO poi_wupplive_available_ids (id, name) VALUES\n`;
		for (const stage of data) {
			sql += `(${stage.id},'${stage.name.replace("'", "''")}'),\n`;
		}
		sql = sql.trim().slice(0, -1); //remove last ,
		sql += ';';
		fs.writeFile(`out/data.sql`, sql, 'utf8', () => console.log(`out/data.sql geschrieben`));
	});
