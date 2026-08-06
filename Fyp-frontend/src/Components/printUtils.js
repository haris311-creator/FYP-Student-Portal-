import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const toPdfPage = (pdf, canvas, startNewPage) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  if (startNewPage) pdf.addPage();

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
};

export const downloadNodeAsPdf = async (node, filename) => {
  if (!node) return;

  const options = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };
  const pageNodes = Array.from(node.querySelectorAll('.sp-page, .pp-page'));
  const nodes = pageNodes.length ? pageNodes : [node];

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < nodes.length; i++) {
    const canvas = await html2canvas(nodes[i], options);
    toPdfPage(pdf, canvas, i > 0);
  }

  pdf.save(filename);
};
