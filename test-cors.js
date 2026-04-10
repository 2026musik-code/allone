async function test() {
  try {
    const res = await fetch("https://api.ferdev.my.id/search/tiktok?query=pargoy&apikey=dedi131");
    console.log("CORS Headers:", res.headers.get("access-control-allow-origin"));
  } catch (e) {
    console.log("Error", e);
  }
}
test();
