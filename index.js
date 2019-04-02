import fetch from 'node-fetch';
//import convert from 'xml-js';
import fs from 'fs';
import cheerio from 'cheerio';

console.log('### started');
let today = new Date();

let defaultConfig = {
	selector: 'select[name=stage]',
	replacements: [ { from: 'film_', to: '' }, { from: 'O', to: '0' } ],
	outDataPath: 'out/data.json',
	outDataSqlPath: 'out/data.sql'
};

let parsedConfig;

try {
	const configFile = fs.readFileSync('config.json', 'utf8');
	parsedConfig = JSON.parse(configFile);
} catch (error) {
	console.log('problem during config.json read. will use default config: ', error);
}

const config = parsedConfig || defaultConfig;

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
		$(config.selector).children().each((i, item) => {
			if (item.attribs.value && item.attribs.value !== 'nop') {
				let value = item.attribs.value;
				if (!parseInt(item.attribs.value, 10)) {
					for (let replacementConfig of config.replacements) {
						const oldValue = value + '';
						value = value.replace(replacementConfig.from, replacementConfig.to);
						if (value != oldValue) {
							console.log('changed from ' + oldValue + ' to ' + value);
						}
					}
				}
				if (idsOnly.indexOf(value) === -1) {
					data.push({
						id: value,
						name: $(item).text()
					});
					idsOnly.push(value);
				} else {
					//onsole.log('duplictae id', value);
				}
			}
		});
		if (config.outDataPath) {
			fs.writeFile(config.outDataPath, JSON.stringify(data, null, 2), 'utf8', () =>
				console.log(`${config.outDataPath} geschrieben`)
			);
		}
		if (config.outDataSqlPath) {
			let sql = `DELETE FROM poi_wupplive_available_ids;`;
			sql += `INSERT INTO poi_wupplive_available_ids (id, name) VALUES\n`;
			for (const stage of data) {
				sql += `(${stage.id},'${stage.name.replace("'", "''")}'),\n`;
			}
			sql = sql.trim().slice(0, -1); //remove last ,
			sql += ';';
			fs.writeFile(config.outDataSqlPath, sql, 'utf8', () =>
				console.log(`${config.outDataSqlPath} geschrieben`)
			);
		}
	});
