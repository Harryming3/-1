#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

def create_pdf_with_chinese(folder_name, filename, title, content):
    """创建包含中文的PDF文档"""
    
    folder_path = os.path.join('/workspace/data', folder_name)
    os.makedirs(folder_path, exist_ok=True)
    
    filepath = os.path.join(folder_path, filename)
    
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=(30, 64, 175)  # 蓝色
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=(100, 116, 139)
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=12,
        alignment=TA_JUSTIFY,
        leading=20
    )
    
    story = []
    
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"—— {content} ——", subtitle_style))
    story.append(Spacer(1, 1*cm))
    
    for i in range(1, 6):
        story.append(Paragraph(f"第{i}章 {content}", styles['Heading2']))
        story.append(Spacer(1, 0.3*cm))
        
        paragraphs = [
            f"本章节详细介绍{content}的第{i}部分内容。",
            f"{content}是企业生产管理的重要组成部分，对于保障安全生产具有重要意义。",
            "一、基本要求\n    1. 严格遵守操作规程\n    2. 定期检查设备设施\n    3. 做好记录存档工作",
            "二、操作流程\n    1. 准备工作\n    2. 实施操作\n    3. 后续处理",
            f"通过严格执行{content}，可以有效预防事故发生，保障员工生命安全和身体健康。",
        ]
        
        for para in paragraphs:
            story.append(Paragraph(para, body_style))
        
        story.append(Spacer(1, 0.5*cm))
        
        if i < 5:
            story.append(PageBreak())
    
    story.append(PageBreak())
    story.append(Paragraph("附录", styles['Heading2']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("附录A: 相关法规标准", body_style))
    story.append(Paragraph("附录B: 操作记录表格", body_style))
    story.append(Paragraph("附录C: 应急预案", body_style))
    
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
    print(f"\n文档存放位置: /workspace/data/")
    print("\n请运行 docker-compose up 启动系统进行测试。")

if __name__ == '__main__':
    main()
