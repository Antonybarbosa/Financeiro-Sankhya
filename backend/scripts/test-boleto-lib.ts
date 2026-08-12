// Teste das funções puras do frontend/lib/boleto.ts (mapa de banco, linha digitável, barcode ITF)
import {
  nomeBanco,
  formatarLinhaDigitavel,
  gerarCodigoDeBarras,
} from '../../frontend/lib/boleto';

const codigoBarras = '23799184200001023173201090000001090900762690';
const linha = '23793.20100  90000.001090  09007.626907  9 18420000102317';

console.log('1. nomeBanco(237):', nomeBanco('237'));
console.log('2. nomeBanco(341):', nomeBanco('341'));
console.log('3. nomeBanco(vazio):', nomeBanco(''));
console.log('4. Linha digitável formatada:', formatarLinhaDigitavel(linha));

const { bars, width } = gerarCodigoDeBarras(codigoBarras);
console.log('5. Barras geradas:', bars.length);
console.log('6. Largura total (unidades):', width.toFixed(1));

// Validações: começa com barra, termina com barra, primeira barra em x=0
console.log('7. Primeira barra x=0:', bars[0].x === 0);
console.log('8. Última barra termina na largura total:', Math.abs(bars[bars.length - 1].x + bars[bars.length - 1].w - width) < 0.01);

// Nenhuma barra com largura inválida
const invalidas = bars.filter((b) => !(b.w === 1 || Math.abs(b.w - 2.3) < 0.001));
console.log('9. Barras com largura inválida:', invalidas.length);
