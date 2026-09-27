

async function test() {
  const params = new URLSearchParams();
  params.append('draw', '1');
  params.append('start', '0');
  params.append('length', '5');
  params.append('partidoSearch', '');
  params.append('nomemprenSearch', '');

  const res = await fetch('https://urbasig.mgob.gba.gob.ar/rpuc/data.php', {
    method: 'POST',
    body: params,
  });

  const data = await res.text();
  console.log(data);
}

test();
