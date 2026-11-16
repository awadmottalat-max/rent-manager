/* تحويل PNG (≤256px) إلى ملف ICO بصيغة PNG المضمّنة (ويندوز فيستا فما فوق) */
function pngToIco(png,size){
  const h=Buffer.alloc(22);h.writeUInt16LE(0,0);h.writeUInt16LE(1,2);h.writeUInt16LE(1,4);
  h.writeUInt8(size>=256?0:size,6);h.writeUInt8(size>=256?0:size,7);h.writeUInt8(0,8);h.writeUInt8(0,9);
  h.writeUInt16LE(1,10);h.writeUInt16LE(32,12);h.writeUInt32LE(png.length,14);h.writeUInt32LE(22,18);
  return Buffer.concat([h,Buffer.from(png)]);
}
module.exports={pngToIco};
