import { load, Path } from 'opentype.js'
import path from 'path'

function getPath(filePath: string) {
  return path.resolve(__dirname, filePath);
}
type P = {
  x: number,
  y: number
}
type M = {
  type: 'min'
}

type L = Omit<M, 'type'> & {
  type: 'line',
  p1: P,
  p2: P
}

type B = Omit<L, 'type'> & {
  type: 'bezier',
  p3: P
}


let d_ind = 0; // 自动距离场变量名,在绘制线段/曲线后,自动+1
/**
 * M并集,L绘制线段,B绘制贝塞尔
 * @param char 指令类型信息
 * @returns 
 */
function getCodeStr(char: M | L | B) {
  if (char.type == 'line') {
    const { p1, p2 } = char;
    let str = `float d${d_ind} = l(p, vec2(${p1.x}, ${p1.y}), vec2(${p2.x}, ${p2.y}));\n`
    d_ind ++;
    return str;
  }
  else if(char.type == 'bezier') {
    const { p1, p2, p3 } = char;
    let str = `float d${d_ind} = s(p, vec2(${p1.x}, ${p1.y}), vec2(${p2.x}, ${p2.y}), vec2(${p3.x}, ${p3.y}));\n`
    d_ind ++;
    return str;
  }
  else if(char.type == 'min'){
    return `d0 = min(d${d_ind-1}, d0);\n`
  }
  return '\n'
}
function path2Shaer(path: Path){
  const commands = path.commands;

  let p1 = { x: 0, y: 0 }; // 起点
  let p2 = { x: 0, y: 0 }; // 终点
  let p3 = { x: 0, y: 0 }; // 控制点

  let code_str = '';
  let sampleGap = 0;
  let sampleGapCount = sampleGap;

  for (let i = 0; i < commands.length; i++) {
    const { type, x, y } = commands[i]
    let str = '';

    if(type !== "M" && sampleGapCount !== 0){
      sampleGapCount--;
      continue;
    }else if(sampleGapCount==0){
      sampleGapCount = sampleGap
    }

    if (type === "M") {
      p1.x = x;
      p1.y = y;
    }
    else if (type === "L") {
      p2.x = x;
      p2.y = y;
      str = getCodeStr({type: 'line', p1, p2})      
      code_str += str;
      p1.x = x;
      p1.y = y;
      
    }else if(type === "Q"){
      p2.x = x;
      p2.y = y;
      p3.x = commands[i].x1;
      p3.y = commands[i].y1;
      // 这里为了跟iq的贝塞尔曲线参数(起点-控制-终点)对应起来,交换了p2 p3的位置
      str = getCodeStr({type: 'bezier', p1, p2: p3, p3: p2})
      code_str += str;
      p1.x = x;
      p1.y = y;
    }
    if(i > 1 && type !== 'Z'){
      const str2 = getCodeStr({type: 'min'});
      code_str += str2;
    }
  }
  code_str += "return d0;\n"

  const res = `
  float char(vec2 p){
    ${code_str}
  }
  `

  return res;
}

async function main() {
  // 用何种字体文件
  // const p = getPath('../fonts/Muyao.TTF')
  // const p = getPath('../fonts/STKAITI.TTF')
  // const p = getPath('../fonts/wingding.ttf')
  const p = getPath('../fonts/STXINGKA.ttf')

  const font = await load(p)

  // const path = font.getPath('水', 0, 0, 1);

  // const glyph = font.charToGlyph('\uF0F8');
  // const path = glyph.getPath(0, 0, 1); // x, y, fontSize


  // 索引查看工具: https://opentype.js.org/glyph-inspector.html
  const glyphIndex = 3004; // 假设这是你要找的索引
  const glyph = font.glyphs.get(glyphIndex);
  const path = glyph.getPath(0, 0, 1)
  
  
  const code = path2Shaer(path);
  console.log(code);
}

main()