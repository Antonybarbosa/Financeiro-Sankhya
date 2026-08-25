import * as fs from 'fs';
import * as path from 'path';

const jsonPath = path.join(
  'C:\\Users\\inovace\\.gemini\\antigravity-ide\\brain\\e50c4f1e-75bc-4a91-884e-afb8929b8df0',
  'tgfpar_fields_list.json',
);

const fields: Array<{ NOMECAMPO: string; DESCRCAMPO: string; TIPO_DESCRICAO: string }> = JSON.parse(
  fs.readFileSync(jsonPath, 'utf-8'),
);

let md = `# Dicionário de Campos da Tabela TGFPAR (Cadastro de Parceiros/Clientes)\n\n`;
md += `Encontrados **${fields.length} campos** cadastrados no dicionário de dados do Sankhya (\`TDDCAM\` / \`TDDTAB\`):\n\n`;
md += `| Nº | Nome do Campo (\`NOMECAMPO\`) | Descrição (\`DESCRCAMPO\`) | Tipo de Dado |\n`;
md += `| :---: | :--- | :--- | :--- |\n`;

fields.forEach((f, i) => {
  md += `| ${i + 1} | \`${f.NOMECAMPO}\` | ${f.DESCRCAMPO || '-'} | ${f.TIPO_DESCRICAO} |\n`;
});

const mdPath = path.join(
  'C:\\Users\\inovace\\.gemini\\antigravity-ide\\brain\\e50c4f1e-75bc-4a91-884e-afb8929b8df0',
  'campos_tabela_tgfpar.md',
);
fs.writeFileSync(mdPath, md, 'utf-8');

console.log(`Markdown gerado com sucesso em: ${mdPath}`);
