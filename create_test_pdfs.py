#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
import os
import sys

# 注册中文字体
font_paths = [
    'C:/Windows/Fonts/simhei.ttf',
    'C:/Windows/Fonts/simsunb.ttf',
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    '/System/Library/Fonts/PingFang.ttc',
]

chinese_font = None
for fp in font_paths:
    if os.path.exists(fp):
        try:
            font_name = os.path.splitext(os.path.basename(fp))[0]
            pdfmetrics.registerFont(TTFont(font_name, fp))
            chinese_font = font_name
            print(f"✓ 注册字体: {font_name} ({fp})")
            break
        except Exception as e:
            print(f"✗ 字体注册失败 {fp}: {e}")

if not chinese_font:
    print("错误: 未找到可用的中文字体!")
    sys.exit(1)

def create_pdf_with_chinese(folder_name, filename, title, content):
    """创建包含中文的PDF文档"""

    folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', folder_name)
    os.makedirs(folder_path, exist_ok=True)

    filepath = os.path.join(folder_path, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2.5*cm,
        leftMargin=2.5*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm
    )

    styles = getSampleStyleSheet()

    # 标题样式
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName=chinese_font,
        fontSize=26,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e3a8a'),
        leading=36
    )

    # 副标题样式
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontName=chinese_font,
        fontSize=14,
        spaceAfter=25,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#64748b'),
        leading=20
    )

    # 章节标题样式
    chapter_style = ParagraphStyle(
        'ChapterTitle',
        parent=styles['Heading2'],
        fontName=chinese_font,
        fontSize=16,
        spaceAfter=15,
        spaceBefore=20,
        textColor=colors.HexColor('#1e40af'),
        leading=24,
        borderWidth=0,
        borderColor=colors.HexColor('#e2e8f0'),
        borderPadding=5,
        leftIndent=0
    )

    # 正文样式
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName=chinese_font,
        fontSize=11,
        spaceAfter=10,
        alignment=TA_JUSTIFY,
        leading=20,
        firstLineIndent=22
    )

    # 列表项样式
    list_style = ParagraphStyle(
        'ListItem',
        parent=styles['Normal'],
        fontName=chinese_font,
        fontSize=11,
        spaceAfter=6,
        alignment=TA_LEFT,
        leading=18,
        leftIndent=30
    )

    # 表格标题样式
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName=chinese_font,
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.white,
        leading=16
    )

    # 表格内容样式
    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName=chinese_font,
        fontSize=10,
        alignment=TA_CENTER,
        leading=16
    )

    story = []

    # 封面标题
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.8*cm))
    story.append(Paragraph(f"—— {content}管理规范 ——", subtitle_style))
    story.append(Spacer(1, 2*cm))

    # 文档信息表格
    doc_info = [
        [Paragraph('文档编号', table_header_style), Paragraph('DOC-' + str(hash(title) % 10000).zfill(4), table_body_style)],
        [Paragraph('版本号', table_header_style), Paragraph('V1.0', table_body_style)],
        [Paragraph('编制部门', table_header_style), Paragraph('质量管理部', table_body_style)],
        [Paragraph('生效日期', table_header_style), Paragraph('2024年1月1日', table_body_style)],
        [Paragraph('密级', table_header_style), Paragraph('内部资料', table_body_style)],
    ]

    doc_table = Table(doc_info, colWidths=[4*cm, 8*cm])
    doc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#1e40af')),
        ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#f1f5f9')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(doc_table)
    story.append(PageBreak())

    # 目录
    story.append(Paragraph("目  录", chapter_style))
    story.append(Spacer(1, 0.5*cm))

    toc_items = [
        "第一章  总则",
        "第二章  管理职责",
        "第三章  操作流程",
        "第四章  检查与考核",
        "第五章  附则",
    ]
    for item in toc_items:
        story.append(Paragraph(item, body_style))
        story.append(Spacer(1, 0.2*cm))
    story.append(PageBreak())

    # 第一章 总则
    story.append(Paragraph("第一章  总则", chapter_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph(
        f"第一条  为规范公司{content}管理工作，保障生产安全，提高工作效率，特制定本制度。",
        body_style
    ))
    story.append(Paragraph(
        f"第二条  本制度适用于公司各部门、各岗位的{content}相关工作。",
        body_style
    ))
    story.append(Paragraph(
        "第三条  {content}管理应遵循以下原则：".format(content=content),
        body_style
    ))
    story.append(Paragraph("（一）安全第一，预防为主；", list_style))
    story.append(Paragraph("（二）分级管理，责任到人；", list_style))
    story.append(Paragraph("（三）持续改进，不断完善。", list_style))
    story.append(PageBreak())

    # 第二章 管理职责
    story.append(Paragraph("第二章  管理职责", chapter_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("第四条  公司管理层职责：", body_style))
    story.append(Paragraph("（一）制定{content}管理的总体方针和目标；".format(content=content), list_style))
    story.append(Paragraph("（二）审批重大{content}管理事项；".format(content=content), list_style))
    story.append(Paragraph("（三）提供必要的资源保障。", list_style))

    story.append(Paragraph("第五条  部门负责人职责：", body_style))
    story.append(Paragraph("（一）组织实施本部门的{content}管理工作；".format(content=content), list_style))
    story.append(Paragraph("（二）监督检查执行情况；", list_style))
    story.append(Paragraph("（三）及时报告异常情况。", list_style))

    story.append(Paragraph("第六条  员工职责：", body_style))
    story.append(Paragraph("（一）严格遵守{content}操作规程；".format(content=content), list_style))
    story.append(Paragraph("（二）参加相关培训教育；", list_style))
    story.append(Paragraph("（三）发现隐患及时上报。", list_style))
    story.append(PageBreak())

    # 第三章 操作流程
    story.append(Paragraph("第三章  操作流程", chapter_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("第七条  准备工作：", body_style))
    story.append(Paragraph("（一）检查设备设施是否完好；", list_style))
    story.append(Paragraph("（二）确认作业环境符合要求；", list_style))
    story.append(Paragraph("（三）穿戴好个人防护用品。", list_style))

    story.append(Paragraph("第八条  操作实施：", body_style))
    story.append(Paragraph("（一）按照标准流程逐步操作；", list_style))
    story.append(Paragraph("（二）做好过程记录；", list_style))
    story.append(Paragraph("（三）遇到问题及时报告。", list_style))

    story.append(Paragraph("第九条  后续处理：", body_style))
    story.append(Paragraph("（一）清理作业现场；", list_style))
    story.append(Paragraph("（二）填写相关记录表单；", list_style))
    story.append(Paragraph("（三）做好交接班工作。", list_style))
    story.append(PageBreak())

    # 第四章 检查与考核
    story.append(Paragraph("第四章  检查与考核", chapter_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("第十条  日常检查：", body_style))
    story.append(Paragraph("（一）班前检查：确认设备状态、环境条件；", list_style))
    story.append(Paragraph("（二）班中检查：监控运行状态、参数指标；", list_style))
    story.append(Paragraph("（三）班后检查：清理现场、交接记录。", list_style))

    story.append(Paragraph("第十一条  定期检查：", body_style))
    story.append(Paragraph("（一）每周进行一次全面检查；", list_style))
    story.append(Paragraph("（二）每月进行一次专项评估；", list_style))
    story.append(Paragraph("（三）每季度进行一次综合评审。", list_style))

    story.append(Paragraph("第十二条  考核标准：", body_style))

    # 考核表格
   考核_data = [
        [Paragraph('考核项目', table_header_style), Paragraph('标准分值', table_header_style), Paragraph('评分标准', table_header_style)],
        [Paragraph('制度执行', table_body_style), Paragraph('30分', table_body_style), Paragraph('严格执行得满分', table_body_style)],
        [Paragraph('记录完整', table_body_style), Paragraph('25分', table_body_style), Paragraph('记录完整得满分', table_body_style)],
        [Paragraph('隐患整改', table_body_style), Paragraph('25分', table_body_style), Paragraph('及时整改得满分', table_body_style)],
        [Paragraph('培训参与', table_body_style), Paragraph('20分', table_body_style), Paragraph('全员参与得满分', table_body_style)],
    ]

    考核_table = Table(考核_data, colWidths=[4*cm, 3*cm, 5*cm])
    考核_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8fafc'), colors.white]),
    ]))
    story.append(考核_table)
    story.append(PageBreak())

    # 第五章 附则
    story.append(Paragraph("第五章  附则", chapter_style))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph(
        "第十三条  本制度由质量管理部负责解释。",
        body_style
    ))
    story.append(Paragraph(
        "第十四条  本制度自发布之日起施行。",
        body_style
    ))
    story.append(Paragraph(
        "第十五条  本制度的修订需经公司管理层审批。",
        body_style
    ))

    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("附件：", chapter_style))
    story.append(Paragraph("附件一：相关法规标准清单", list_style))
    story.append(Paragraph("附件二：操作记录表格模板", list_style))
    story.append(Paragraph("附件三：应急预案流程图", list_style))
    story.append(Paragraph("附件四：培训计划安排表", list_style))

    doc.build(story)
    print(f"✓ 已创建: {filepath}")

def main():
    categories = {
        '安全制度': [
            ('安全生产操作规程.pdf', '安全生产操作规程', '安全生产'),
            ('消防安全管理制度.pdf', '消防安全管理制度', '消防管理'),
            ('职业健康管理规定.pdf', '职业健康管理规定', '职业健康'),
        ],
        '作业指导书': [
            ('设备操作指导书.pdf', '设备操作指导书', '设备操作'),
            ('生产工艺作业指导书.pdf', '生产工艺作业指导书', '生产工艺'),
            ('检验作业指导书.pdf', '检验作业指导书', '检验作业'),
        ],
        '质量规范': [
            ('质量管理体系文件.pdf', '质量管理体系文件', '质量管理体系'),
            ('产品检验标准.pdf', '产品检验标准', '产品检验'),
            ('不合格品处理规范.pdf', '不合格品处理规范', '不合格品处理'),
        ],
        '其他': [
            ('员工手册.pdf', '员工手册', '员工管理'),
            ('保密制度.pdf', '保密制度', '保密管理'),
            ('培训管理制度.pdf', '培训管理制度', '培训管理'),
        ]
    }

    print("开始生成测试PDF文档...\n")

    for folder, files in categories.items():
        print(f"\n📁 {folder}")
        print("-" * 40)
        for filename, title, content in files:
            create_pdf_with_chinese(folder, filename, title, content)

    print("\n✅ 所有测试文档已生成完成！")
    print(f"\n文档存放位置: data/")

if __name__ == '__main__':
    main()
