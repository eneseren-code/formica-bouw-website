import { spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaRoot = path.join(projectRoot, "public", "media");
const outputRoot = path.join(mediaRoot, "generated");

const images = [
  path.join(mediaRoot, "details", "renovation-modern-bath.jpg"),
  path.join(mediaRoot, "details", "renovation-bathroom.jpg"),
  path.join(mediaRoot, "projects", "project-08.jpg"),
  path.join(mediaRoot, "details", "renovation-modern-bath.jpg"),
];

const outputs = {
  desktop: {
    webm: path.join(outputRoot, "formica-hero.webm"),
    mp4: path.join(outputRoot, "formica-hero.mp4"),
    poster: path.join(outputRoot, "formica-hero-poster.webp"),
  },
  mobile: {
    webm: path.join(outputRoot, "formica-hero-mobile.webm"),
    mp4: path.join(outputRoot, "formica-hero-mobile.mp4"),
    poster: path.join(outputRoot, "formica-hero-mobile-poster.webp"),
  },
};

if (!ffmpegPath) throw new Error("ffmpeg-static did not provide a binary path.");
mkdirSync(outputRoot, { recursive: true });

function run(args, label) {
  const result = spawnSync(ffmpegPath, args, { cwd: projectRoot, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}.`);
}

const inputArgs = images.flatMap((image) => ["-loop", "1", "-framerate", "24", "-t", "2.7", "-i", image]);
const desktopFilter = [
  "[0:v]scale=1760:990:force_original_aspect_ratio=increase,crop=1760:990,zoompan=z='min(zoom+0.00085,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1600x900:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.88:contrast=1.035[v0]",
  "[1:v]scale=1760:990:force_original_aspect_ratio=increase,crop=1760:990,zoompan=z='min(zoom+0.0007,1.045)':x='iw/2-(iw/zoom/2)-18+(on/63)*36':y='ih/2-(ih/zoom/2)':d=1:s=1600x900:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.86:contrast=1.04[v1]",
  "[2:v]scale=1760:990:force_original_aspect_ratio=increase,crop=1760:990,zoompan=z='min(zoom+0.0008,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+(on/63)*20':d=1:s=1600x900:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.9:contrast=1.03[v2]",
  "[3:v]scale=1760:990:force_original_aspect_ratio=increase,crop=1760:990,zoompan=z='if(eq(on,0),1.055,max(zoom-0.00088,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1600x900:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.88:contrast=1.035[v3]",
  "[v0][v1]xfade=transition=fade:duration=0.5:offset=2.125[x1]",
  "[x1][v2]xfade=transition=fade:duration=0.5:offset=4.25[x2]",
  "[x2][v3]xfade=transition=fade:duration=0.5:offset=6.375,format=yuv420p[out]",
].join(";");

const mobileFilter = [
  "[0:v]scale=792:1408:force_original_aspect_ratio=increase,crop=792:1408:x='(iw-ow)*0.52':y='(ih-oh)/2',zoompan=z='min(zoom+0.00085,1.055)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x1280:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.88:contrast=1.035[v0]",
  "[1:v]scale=792:1408:force_original_aspect_ratio=increase,crop=792:1408:x='(iw-ow)*0.27':y='(ih-oh)/2',zoompan=z='min(zoom+0.0007,1.045)':x='iw/2-(iw/zoom/2)-8+(on/63)*16':y='ih/2-(ih/zoom/2)':d=1:s=720x1280:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.86:contrast=1.04[v1]",
  "[2:v]scale=792:1408:force_original_aspect_ratio=increase,crop=792:1408:x='(iw-ow)*0.48':y='(ih-oh)/2',zoompan=z='min(zoom+0.0008,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+(on/63)*10':d=1:s=720x1280:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.9:contrast=1.03[v2]",
  "[3:v]scale=792:1408:force_original_aspect_ratio=increase,crop=792:1408:x='(iw-ow)*0.52':y='(ih-oh)/2',zoompan=z='if(eq(on,0),1.055,max(zoom-0.00088,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x1280:fps=24,trim=duration=2.625,setpts=PTS-STARTPTS,eq=saturation=0.88:contrast=1.035[v3]",
  "[v0][v1]xfade=transition=fade:duration=0.5:offset=2.125[x1]",
  "[x1][v2]xfade=transition=fade:duration=0.5:offset=4.25[x2]",
  "[x2][v3]xfade=transition=fade:duration=0.5:offset=6.375,format=yuv420p[out]",
].join(";");

function commonVideoArgs(filter) {
  return [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-an",
    "-r",
    "24",
    "-t",
    "9",
  ];
}

function encodeVariant(name, filter, output, quality) {
  run([
    ...commonVideoArgs(filter),
    "-c:v",
    "libvpx-vp9",
    "-crf",
    String(quality.webmCrf),
    "-b:v",
    "0",
    "-row-mt",
    "1",
    "-deadline",
    "good",
    "-cpu-used",
    "2",
    output.webm,
  ], `${name} WebM encoding`);

  run([
    ...commonVideoArgs(filter),
    "-c:v",
    "libx264",
    "-crf",
    String(quality.mp4Crf),
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output.mp4,
  ], `${name} MP4 encoding`);

  run([
    "-y",
    "-i",
    output.mp4,
    "-frames:v",
    "1",
    "-c:v",
    "libwebp",
    "-quality",
    "78",
    "-compression_level",
    "6",
    output.poster,
  ], `${name} poster encoding`);
}

encodeVariant("Desktop", desktopFilter, outputs.desktop, { webmCrf: 35, mp4Crf: 24 });
encodeVariant("Mobile", mobileFilter, outputs.mobile, { webmCrf: 38, mp4Crf: 26 });

const budgets = [
  [outputs.desktop.webm, 1.8 * 1024 * 1024],
  [outputs.desktop.mp4, 2.5 * 1024 * 1024],
  [outputs.desktop.poster, 250 * 1024],
  [outputs.mobile.webm, 1.5 * 1024 * 1024],
  [outputs.mobile.mp4, 2 * 1024 * 1024],
  [outputs.mobile.poster, 250 * 1024],
];

for (const [file, budget] of budgets) {
  const size = statSync(file).size;
  if (size > budget) {
    throw new Error(`${path.basename(file)} is ${Math.round(size / 1024)} KB, above its ${Math.round(budget / 1024)} KB budget.`);
  }
  console.log(`${path.basename(file)}: ${Math.round(size / 1024)} KB`);
}
