async function test() {
  const url = "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/471de84f96201d96ca4ae533bf85a6ce~tplv-836v1mcgsk-image-quality-ttk1-cp:570:810.heic?rk3s=95ec04ee&x-expires=1777507483&x-signature=uWNzRcRzHh001cGmIxITTO%2B3tec%3D";
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
  
  try {
    const res = await fetch(proxyUrl);
    console.log("Proxy:", res.status, res.headers.get("content-type"));
  } catch (e) {
    console.log("Proxy Error:", e.message);
  }
}
test();
