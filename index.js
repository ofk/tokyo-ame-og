const { URL } = require('url');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');

const h = (str) => `${str}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderOgPage = (data) => {
  const ogContents = ['type', 'title', 'description', 'image', 'url', 'site_name']
        .filter((key) => data[key])
        .map((key) => `<meta property="og:${key}" content="${h(data[key])}">`);
  const titleContent = data.url ? `<a href="${h(data.url)}">${h(data.title)}</a>` : h(data.title);
  const descriptionContent = data.description ? `<p>${h(data.description)}</p>` : '';
  const imageContent = data.image ? `<p><img src="${h(data.image)}"></p>` : '';
  return `<!DOCTYPE html>
<html>
<head>
<title>${h(data.title)}</title>
${ogContents.join('\n')}
</head>
<body>
<h1>${titleContent}</h1>
${descriptionContent}
${imageContent}
</body>
</html>`;
};

const indexPage = (url) => fetch(`https://tokyo-ame.jwa.or.jp/scripts/mesh_index.js?${Math.round(Date.now() / 150000)}`)
      .then((res) => res.text())
      .then((res) => {
        const mt = /"(.*?)"/.exec(res);
        const md = mt ? /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(mt[1]) : null;
        return renderOgPage({
          type: 'website',
          image: mt ? `${url.origin}/image?t=${mt[1]}` : null,
          url: 'https://tokyo-ame.jwa.or.jp/',
          title: 'amesh now',
          description: md ? `${md[1]}-${md[2]}-${md[3]} ${md[4]}:${md[5]}` : 'Umm.',
        });
      });

const imagePage = (url) => Promise.all([
  loadImage('https://tokyo-ame.jwa.or.jp/map/map150.jpg'),
  loadImage(`https://tokyo-ame.jwa.or.jp/mesh/100/${url.searchParams.get('t')}.gif`),
  loadImage('https://tokyo-ame.jwa.or.jp/map/msk150.png'),
]).then((images) => {
  const x = parseFloat(url.searchParams.get('x')) || 0.6;
  const y = parseFloat(url.searchParams.get('y')) || 0.5;
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');
  const widthRatio = canvas.width / images[0].width;
  const heightRatio = canvas.height / images[0].height;
  images.forEach((image) => {
    ctx.drawImage(
      image,
      image.width * (x - widthRatio / 2),
      image.height * (y - heightRatio / 2),
      image.width * widthRatio,
      image.height * heightRatio,
      0, 0, canvas.width, canvas.height
    );
  });
  return canvas.toBuffer();
});

module.exports = (req, res) => {
  const url = new URL(`${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}${req.url}`);

  switch (url.pathname) {
    case '/':
      indexPage(url).then((data) => {
        res.send(data);
      });
      break;
    case '/image':
      if (url.searchParams.get('t')) {
        imagePage(url).then((data) => {
          res.end(data);
        });
      } else {
        res.status(500).send('Internal Server Error');
      }
      break;
    default:
      res.status(404).send('Not Found');
      break;
  }
};
