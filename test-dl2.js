async function test() {
  const apiKey = "dedi131";
  const url = `https://api.ferdev.my.id/search/tiktok?query=pargoy&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.result && data.result.length > 0) {
      const tiktokUrl = data.result[0].url;
      console.log("Found TikTok URL:", tiktokUrl);
      
      const dlUrl = `https://api.ferdev.my.id/downloader/allinone?link=${encodeURIComponent(tiktokUrl)}&apikey=${apiKey}`;
      const dlRes = await fetch(dlUrl);
      const dlData = await dlRes.json();
      console.log(JSON.stringify(dlData, null, 2));
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
