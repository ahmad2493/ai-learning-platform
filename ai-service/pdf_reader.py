"""
PDF Reader - PDF to Markdown Converter
Author: Sajeela Safdar (BCSF22M001)

Functionality:
  - Converts PDF documents to markdown format for RAG processing
  - Uses Docling library for advanced PDF parsing
  - Processes PDFs in batches to handle large documents
  - Extracts text, tables, and mathematical content
  - Optimizes memory usage with garbage collection
  - Supports CUDA acceleration for faster processing
"""

import gc
import time
import torch
from docling.document_converter import DocumentConverter, PdfFormatOption, InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, RapidOcrOptions
from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
import pickle
import PyPDF2
import os
import logging

logging.basicConfig(level=logging.INFO, force=True)

def convert_pdf_in_batches(input_pdf, output_markdown, pipeline, pages_per_batch=5):
    with open(input_pdf, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        total_pages = len(pdf_reader.pages)
    # Create a converter
    acc_options = AcceleratorOptions(device=AcceleratorDevice.CUDA)
    converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(
                        pipeline_options=pipeline,
                        accelerator_options=acc_options
                    )
                }
            )

    # Process in batches
    for start_page in range(1, total_pages, pages_per_batch):
        end_page = min(start_page + pages_per_batch, total_pages)
        print(f"Processing pages {start_page} to {end_page}...")

        try:

            result = converter.convert(input_pdf,page_range=[start_page, end_page])
            text = result.document.export_to_markdown()

            with open(output_markdown, "a") as f:
                if start_page > 0:
                    f.write("\n\n---\n\n")
                f.write(text)

            # Clean up memory
            del result
            del text
            gc.collect()
            gc.collect()
            gc.collect()
            torch.cuda.empty_cache()

            time.sleep(2)

            print(f" Completed pages {start_page} to {end_page}")

        except Exception as e:
            print(f"✗ Error processing pages {start_page} to {end_page}: {e}")
            # Continue with the next batch even if this one fails
            continue



input_pdf = "/content/PhysicsBook.pdf"
output_markdown = "PhysicsBook_docling.md"

pipeline = PdfPipelineOptions(
    do_formula_enrichment=True,
    #do_ocr=True,
    ocr_options= RapidOcrOptions(force_full_page_ocr=True, lang=["eng","equ", "math"], backend="torch"),
)

convert_pdf_in_batches(input_pdf, output_markdown, pipeline)



