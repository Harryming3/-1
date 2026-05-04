const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// 查找系统中的中文字体
function findChineseFont() {
  const fontPaths = [
    'C:/Windows/Fonts/simhei.ttf',
    'C:/Windows/Fonts/simsunb.ttf',
    'C:/Windows/Fonts/msyh.ttc',
    'C:/Windows/Fonts/msyhbd.ttc',
  ];

  for (const fp of fontPaths) {
    if (fs.existsSync(fp)) {
      console.log(`✓ 使用字体: ${fp}`);
      return fp;
    }
  }

  // 如果没有中文字体，下载一个
  console.log('未找到中文字体，使用默认字体（中文可能显示为方框）');
  return null;
}

const chineseFont = findChineseFont();

function createPDF(folderName, filename, title, content) {
  const folderPath = path.join(DATA_DIR, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const filepath = path.join(folderPath, filename);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // 注册中文字体
  if (chineseFont) {
    doc.registerFont('ChineseFont', chineseFont);
  }
  const fontName = chineseFont ? 'ChineseFont' : 'Helvetica';

  // 封面标题
  doc.font(fontName).fontSize(28)
     .fillColor('#1e3a8a')
     .text(title, 50, 200, { align: 'center' });

  doc.font(fontName).fontSize(14)
     .fillColor('#64748b')
     .text(`—— ${content}管理规范 ——`, 50, 260, { align: 'center' });

  // 文档信息表格
  doc.moveDown(4);
  const infoData = [
    ['文档编号', `DOC-${String(Math.abs(title.split('').reduce((a,b)=>a+b.charCodeAt(0),0) % 10000)).padStart(4,'0')}`],
    ['版本号', 'V1.0'],
    ['编制部门', '质量管理部'],
    ['生效日期', '2024年1月1日'],
    ['密级', '内部资料'],
  ];

  let y = doc.y;
  infoData.forEach(([label, value]) => {
    doc.rect(100, y, 120, 30).fill('#1e40af');
    doc.fillColor('white').font(fontName).fontSize(11).text(label, 100, y + 8, { width: 120, align: 'center' });
    doc.rect(220, y, 200, 30).fill('#f1f5f9');
    doc.fillColor('#334155').font(fontName).fontSize(11).text(value, 220, y + 8, { width: 200, align: 'center' });
    y += 30;
  });

  // 新页面 - 目录
  doc.addPage();
  doc.font(fontName).fontSize(20).fillColor('#1e40af').text('目  录', 50, 50, { align: 'center' });
  doc.moveDown(1);

  const tocItems = [
    '第一章  总则',
    '第二章  管理职责',
    '第三章  操作流程',
    '第四章  检查与考核',
    '第五章  附则',
  ];
  tocItems.forEach(item => {
    doc.font(fontName).fontSize(12).fillColor('#334155').text(item, 80, doc.y);
    doc.moveDown(0.5);
  });

  // 第一章
  doc.addPage();
  doc.font(fontName).fontSize(18).fillColor('#1e40af').text('第一章  总则', 50, 50);
  doc.moveDown(1);

  doc.font(fontName).fontSize(11).fillColor('#334155');
  doc.text(`第一条  为规范公司${content}管理工作，保障生产安全，提高工作效率，特制定本制度。`, { align: 'justify', indent: 22 });
  doc.moveDown(0.5);
  doc.text(`第二条  本制度适用于公司各部门、各岗位的${content}相关工作。`, { align: 'justify', indent: 22 });
  doc.moveDown(0.5);
  doc.text(`第三条  ${content}管理应遵循以下原则：`, { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text('（一）安全第一，预防为主；', { indent: 44 });
  doc.text('（二）分级管理，责任到人；', { indent: 44 });
  doc.text('（三）持续改进，不断完善。', { indent: 44 });

  // 第二章
  doc.addPage();
  doc.font(fontName).fontSize(18).fillColor('#1e40af').text('第二章  管理职责', 50, 50);
  doc.moveDown(1);

  doc.font(fontName).fontSize(11).fillColor('#334155');
  doc.text('第四条  公司管理层职责：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text(`（一）制定${content}管理的总体方针和目标；`, { indent: 44 });
  doc.text('（二）审批重大管理事项；', { indent: 44 });
  doc.text('（三）提供必要的资源保障。', { indent: 44 });
  doc.moveDown(0.5);

  doc.text('第五条  部门负责人职责：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text(`（一）组织实施本部门的${content}管理工作；`, { indent: 44 });
  doc.text('（二）监督检查执行情况；', { indent: 44 });
  doc.text('（三）及时报告异常情况。', { indent: 44 });
  doc.moveDown(0.5);

  doc.text('第六条  员工职责：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text(`（一）严格遵守${content}操作规程；`, { indent: 44 });
  doc.text('（二）参加相关培训教育；', { indent: 44 });
  doc.text('（三）发现隐患及时上报。', { indent: 44 });

  // 第三章
  doc.addPage();
  doc.font(fontName).fontSize(18).fillColor('#1e40af').text('第三章  操作流程', 50, 50);
  doc.moveDown(1);

  doc.font(fontName).fontSize(11).fillColor('#334155');
  doc.text('第七条  准备工作：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text('（一）检查设备设施是否完好；', { indent: 44 });
  doc.text('（二）确认作业环境符合要求；', { indent: 44 });
  doc.text('（三）穿戴好个人防护用品。', { indent: 44 });
  doc.moveDown(0.5);

  doc.text('第八条  操作实施：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text('（一）按照标准流程逐步操作；', { indent: 44 });
  doc.text('（二）做好过程记录；', { indent: 44 });
  doc.text('（三）遇到问题及时报告。', { indent: 44 });
  doc.moveDown(0.5);

  doc.text('第九条  后续处理：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text('（一）清理作业现场；', { indent: 44 });
  doc.text('（二）填写相关记录表单；', { indent: 44 });
  doc.text('（三）做好交接班工作。', { indent: 44 });

  // 第四章
  doc.addPage();
  doc.font(fontName).fontSize(18).fillColor('#1e40af').text('第四章  检查与考核', 50, 50);
  doc.moveDown(1);

  doc.font(fontName).fontSize(11).fillColor('#334155');
  doc.text('第十条  日常检查：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text('（一）班前检查：确认设备状态、环境条件；', { indent: 44 });
  doc.text('（二）班中检查：监控运行状态、参数指标；', { indent: 44 });
  doc.text('（三）班后检查：清理现场、交接记录。', { indent: 44 });
  doc.moveDown(0.5);

  doc.text('第十一条  定期检查：', { align: 'justify', indent: 22 });
  doc.moveDown(0.3);
  doc.text('（一）每周进行一次全面检查；', { indent: 44 });
  doc.text('（二）每月进行一次专项评估；', { indent: 44 });
  doc.text('（三）每季度进行一次综合评审。', { indent: 44 });
  doc.moveDown(0.5);

  doc.text('第十二条  考核标准：', { align: 'justify', indent: 22 });
  doc.moveDown(0.5);

  // 考核表格
  const tableData = [
    ['考核项目', '标准分值', '评分标准'],
    ['制度执行', '30分', '严格执行得满分'],
    ['记录完整', '25分', '记录完整得满分'],
    ['隐患整改', '25分', '及时整改得满分'],
    ['培训参与', '20分', '全员参与得满分'],
  ];

  const tableTop = doc.y;
  const colWidths = [120, 80, 180];
  const rowHeight = 30;

  tableData.forEach((row, i) => {
    const y = tableTop + i * rowHeight;
    row.forEach((cell, j) => {
      const x = 50 + colWidths.slice(0, j).reduce((a, b) => a + b, 0);
      if (i === 0) {
        doc.rect(x, y, colWidths[j], rowHeight).fill('#1e40af');
        doc.fillColor('white').font(fontName).fontSize(10).text(cell, x, y + 8, { width: colWidths[j], align: 'center' });
      } else {
        doc.rect(x, y, colWidths[j], rowHeight).fill(i % 2 === 0 ? '#f8fafc' : 'white');
        doc.fillColor('#334155').font(fontName).fontSize(10).text(cell, x, y + 8, { width: colWidths[j], align: 'center' });
      }
    });
  });

  // 第五章
  doc.addPage();
  doc.font(fontName).fontSize(18).fillColor('#1e40af').text('第五章  附则', 50, 50);
  doc.moveDown(1);

  doc.font(fontName).fontSize(11).fillColor('#334155');
  doc.text('第十三条  本制度由质量管理部负责解释。', { align: 'justify', indent: 22 });
  doc.moveDown(0.5);
  doc.text('第十四条  本制度自发布之日起施行。', { align: 'justify', indent: 22 });
  doc.moveDown(0.5);
  doc.text('第十五条  本制度的修订需经公司管理层审批。', { align: 'justify', indent: 22 });
  doc.moveDown(1);

  doc.font(fontName).fontSize(14).fillColor('#1e40af').text('附件：', 50, doc.y);
  doc.moveDown(0.5);
  doc.font(fontName).fontSize(11).fillColor('#334155');
  doc.text('附件一：相关法规标准清单', { indent: 30 });
  doc.text('附件二：操作记录表格模板', { indent: 30 });
  doc.text('附件三：应急预案流程图', { indent: 30 });
  doc.text('附件四：培训计划安排表', { indent: 30 });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`✓ 已创建: ${filepath}`);
      resolve();
    });
    stream.on('error', reject);
  });
}

async function main() {
  const categories = {
    '安全制度': [
      ['安全生产操作规程.pdf', '安全生产操作规程', '安全生产'],
      ['消防安全管理制度.pdf', '消防安全管理制度', '消防管理'],
      ['职业健康管理规定.pdf', '职业健康管理规定', '职业健康'],
    ],
    '作业指导书': [
      ['设备操作指导书.pdf', '设备操作指导书', '设备操作'],
      ['生产工艺作业指导书.pdf', '生产工艺作业指导书', '生产工艺'],
      ['检验作业指导书.pdf', '检验作业指导书', '检验作业'],
    ],
    '质量规范': [
      ['质量管理体系文件.pdf', '质量管理体系文件', '质量管理体系'],
      ['产品检验标准.pdf', '产品检验标准', '产品检验'],
      ['不合格品处理规范.pdf', '不合格品处理规范', '不合格品处理'],
    ],
    '其他': [
      ['员工手册.pdf', '员工手册', '员工管理'],
      ['保密制度.pdf', '保密制度', '保密管理'],
      ['培训管理制度.pdf', '培训管理制度', '培训管理'],
    ],
  };

  console.log('开始生成测试PDF文档...\n');

  for (const [folder, files] of Object.entries(categories)) {
    console.log(`\n📁 ${folder}`);
    console.log('-'.repeat(40));
    for (const [filename, title, content] of files) {
      await createPDF(folder, filename, title, content);
    }
  }

  console.log('\n✅ 所有测试文档已生成完成！');
  console.log(`\n文档存放位置: ${DATA_DIR}`);
}

main().catch(console.error);
