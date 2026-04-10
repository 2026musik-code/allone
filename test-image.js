async function test() {
  const url = "https://p16-novel-sign-sg.fizzopic.org/novel-images-sg/471de84f96201d96ca4ae533bf85a6ce~tplv-836v1mcgsk-image-quality-ttk1-cp:570:810.heic?rk3s=95ec04ee&x-expires=1777507483&x-signature=uWNzRcRzHh001cGmIxITTO%2B3tec%3D";
  
  // Test 1: Fetch original
  try {
    const res = await fetch(url);
    console.log("Original:", res.status, res.headers.get("content-type"));
  } catch (e) {
    console.log("Original Error:", e.message);
  }

  // Test 2: Replace .heic with .jpeg
  try {
    const url2 = url.replace(".heic", ".jpeg");
    const res = await fetch(url2);
    console.log("JPEG:", res.status, res.headers.get("content-type"));
  } catch (e) {
    console.log("JPEG Error:", e.message);
  }
  
  // Test 3: Replace .heic with .webp
  try {
    const url3 = url.replace(".heic", ".webp");
    const res = await fetch(url3);
    console.log("WEBP:", res.status, res.headers.get("content-type"));
  } catch (e) {
    console.log("WEBP Error:", e.message);
  }
}
test();
