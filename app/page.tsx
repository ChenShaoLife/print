"use client";
import { useEffect, useState } from "react";

type Student = { name: string; grade: string; tickets: number };
type Ticket = { id: number; name: string; grade: string; region: string; ticket_no: string };

export default function Page() {
  const [students, setStudents] = useState<Student[]>([]);
  const [region, setRegion] = useState("SK");
  const [logo, setLogo] = useState<string | null>(null);
  const [bg, setBg] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [textarea, setTextarea] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    (async () => {
      await refreshMedia();
      await refreshRegion();
      await refreshTickets();
    })();
  }, []);

  async function refreshRegion() {
    const r = await fetch("/api/region").then(r => r.json());
    if (r?.region) setRegion(r.region);
  }
  async function updateRegion() {
    const r = await fetch("/api/region", { method: "POST", body: JSON.stringify({ region }) }).then(r => r.json());
    if (r?.error) return alert("更新失败：" + r.error);
    alert("✅ 地区已更新为：" + r.region);
    await refreshTickets();
  }

  async function refreshMedia() {
    const m = await fetch("/api/media").then(r => r.json()).catch(() => ({} as any));
    setLogo(m?.logo || null);
    setBg(m?.bg || null);
  }
  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const dataUrl = await fileToDataURL(f);
    const r = await fetch("/api/media/logo", { method: "POST", body: JSON.stringify({ dataUrl }) }).then(r => r.json());
    if (r?.error) return alert("上传失败：" + r.error);
    setLogo(r.logo);
  }
  async function uploadBg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const dataUrl = await fileToDataURL(f);
    const r = await fetch("/api/media/bg", { method: "POST", body: JSON.stringify({ dataUrl }) }).then(r => r.json());
    if (r?.error) return alert("上传失败：" + r.error);
    setBg(r.bg);
  }
  function useDefaultBackground() {
    setBg(null);
    fetch("/api/media/bg", { method: "DELETE" });
  }

  function loadSampleData() {
    const sample = [
      "郭佳妮,Y1,35","李昕恩,Y1,44","赖彬宇,Y1,50","梁皓宇,Y1,35",
      "黄彦舜,Y1,32","郑能亓,Y1,18","詹紫宜,Y1,23","蒲品杏,Y1,22",
      "郭樍螘,Y2,28","洪子原,Y2,25","林妤霏,Y2,19","钟永成,Y2,28",
      "陈芷妤,Y2,55","李玮萍,Y2,57","陈佑铭,Y2,6","许恩浩,Y2,5"
    ].join("\n");
    setTextarea(sample);
  }

  async function parseStudentData() {
    const txt = textarea.trim();
    if (!txt) { setStatus("❌ 请输入学生数据！"); return; }
    const lines = txt.split("\n").map(s => s.trim()).filter(Boolean);
    const resp = await fetch("/api/students/bulk", { method: "POST", body: JSON.stringify({ lines }) }).then(r => r.json());
    if (resp?.error) { setStatus("❌ 解析错误：" + resp.error); return; }
    setStatus("✅ 数据已保存到 Upstash Redis！");
    const list: Student[] = lines.map(line => {
      const [name, grade, tickets] = line.split(",").map(s => s.trim());
      return { name, grade, tickets: parseInt(tickets, 10) || 0 };
    });
    setStudents(list);
  }

  function showAll() { if (students.length) renderPreview(students, null); }
  function showByGrade() { if (!students.length) return alert("请先输入/加载数据"); renderPreview(students, "grade"); }
  function clearStudentData() {
    setStudents([]);
    (document.getElementById("tickets-container") as HTMLElement).innerHTML =
      '<p style="text-align:center;color:#666;">请先输入/加载数据</p>';
    setStatus("");
  }

  async function generateOnServer() {
    const r = await fetch("/api/tickets/generate", { method: "POST" }).then(r => r.json());
    if (r?.error) return alert("生成失败：" + r.error);
    alert("✅ 生成完成（已写入 Upstash Redis）");
    await refreshTickets();
  }
  async function refreshTickets() {
    const rows: Ticket[] = await fetch("/api/tickets").then(r => r.json());
    setTickets(rows);
    if (rows.length) {
      const pseudo: Student[] = rows.map(t => ({ name: t.name, grade: t.grade, tickets: 1 }));
      setStudents(pseudo);
      renderPreview(pseudo, null, rows);
    }
  }

  function renderPreview(list: Student[], mode: "grade" | null, fromTickets?: Ticket[]) {
    const container = document.getElementById("tickets-container") as HTMLElement;
    if (!list.length) { container.innerHTML = '<p style="text-align:center;color:#666;">请先输入/加载数据</p>'; return; }
    let html = "";
    if (mode === "grade") {
      const grades = Array.from(new Set(list.map(s => s.grade))).sort();
      for (const g of grades) {
        html += '<div class="grade-header">'+g+' 年级</div>';
        list.filter(s => s.grade === g).forEach(s => {
          for (let i=0;i<(s.tickets||0);i++) {
            const tNo = fromTickets?.find(t => t.name===s.name && t.grade===s.grade)?.ticket_no ?? "————";
            html += createTicket(s.name, s.grade, tNo);
          }
        });
      }
    } else {
      list.forEach(s => {
        for (let i=0;i<(s.tickets||0);i++) {
          const tNo = fromTickets?.find(t => t.name===s.name && t.grade===s.grade)?.ticket_no ?? "————";
          html += createTicket(s.name, s.grade, tNo);
        }
      });
    }
    container.innerHTML = html;
  }

  function createTicket(name: string, grade: string, ticketNo: string) {
    const bgStyle = bg ? `background-image:url(${bg});background-size:cover;background-position:center;` : "";
    const logoHtml = logo ? `<img src="${logo}" class="logo" alt="logo">` : `<div class="default-logo">🎫</div>`;
    return `
      <div class="ticket ${bg ? "ticket-with-bg" : ""}" style="${bgStyle}">
        <div class="logo-container">${logoHtml}</div>
        <div class="info-overlay">
          <div class="info-row"><span class="info-label">姓名：</span><span class="info-value">${name}</span></div>
          <div class="info-row"><span class="info-label">年级：</span><span class="info-value">${grade}</span></div>
          <div class="info-row"><span class="info-label">地区：</span><span class="info-value">${region}</span></div>
          <div class="info-row"><span class="info-label">编号：</span><span class="info-value">${ticketNo || "————"}</span></div>
        </div>
      </div>
    `;
  }

  async function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function printA4Layout() {
    await refreshTickets();
    const a4 = document.getElementById("a4-container") as HTMLElement;
    a4.innerHTML = "";
    const ticketsEls = Array.from(document.querySelectorAll("#tickets-container .ticket"));
    const perPage = 12;
    for (let i = 0; i < ticketsEls.length; i += perPage) {
      const page = document.createElement("div");
      page.className = "a4-page";
      ticketsEls.slice(i, i + perPage).forEach((t) => {
        const wrap = document.createElement("div");
        wrap.className = "a4-ticket";
        wrap.innerHTML = (t as HTMLElement).outerHTML;
        page.appendChild(wrap);
      });
      a4.appendChild(page);
    }
    window.print();
  }

  return (
    <main className="container">
      <style>{css}</style>

      <section className="card summary">
        <h3>📊 抽奖券生成统计</h3>
        <div id="summary-text">
          <div>地区：<b>{region}</b></div>
          <div>已加载学生：<b>{students.length}</b></div>
          <div>数据库票：<b>{tickets.length}</b></div>
          <div>Logo：<b>{logo ? "✅" : "🎫 内置"}</b></div>
          <div>背景：<b>{bg ? "✅" : "🎨 默认"}</b></div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card controls">
          <h4>👥 学生数据输入</h4>
          <p>格式：姓名,年级,抽奖券数量</p>
          <textarea id="studentDataInput" className="student-input-area" value={textarea} onChange={(e) => setTextarea(e.target.value)} />
          <div className="button-row">
            <button className="action-btn" onClick={parseStudentData}>📝 解析并保存（Upstash）</button>
            <button className="action-btn" onClick={loadSampleData}>📋 加载示例数据</button>
            <button className="clear-btn" onClick={clearStudentData}>🗑️ 清空预览</button>
          </div>
          <div className="warning-text" style={{ color: status.startsWith("✅") ? "#0d9488" : "#d63384" }}>{status}</div>

          <h4 style={{marginTop:16}}>🌍 地区设置</h4>
          <input id="regionInput" className="region-input" value={region} onChange={(e)=>setRegion(e.target.value)} />
          <div className="button-row">
            <button className="action-btn" onClick={updateRegion}>✅ 更新地区</button>
          </div>

          <h4 style={{marginTop:16}}>🏢 上传 Logo</h4>
          <input type="file" accept="image/*" onChange={uploadLogo} />

          <h4 style={{marginTop:16}}>🖼 背景图片</h4>
          <input type="file" accept="image/*" onChange={uploadBg} />
          <div className="button-row">
            <button className="upload-btn" onClick={useDefaultBackground}>🎨 使用默认背景</button>
          </div>

          <div className="button-row" style={{marginTop:10}}>
            <button className="download-btn" onClick={generateOnServer}>🧮 生成票（编号入库）</button>
            <button className="download-btn" onClick={refreshTickets}>🔄 从数据库加载票</button>
            <button className="download-btn" onClick={printA4Layout}>📄 A4 排版打印</button>
            <button className="download-btn" onClick={showByGrade}>📚 按年级显示</button>
            <button className="download-btn" onClick={showAll}>📋 显示全部</button>
          </div>
        </div>

        <div className="card">
          <h4 style={{marginBottom:6}}>🎫 预览区</h4>
          <p style={{marginTop:0}}>解析后显示生成的抽奖券。可上传 Logo / 背景图预览。</p>
          <div id="tickets-container" className="tickets-grid">
            <p style={{textAlign:"center", color:"#666", fontSize:16, margin:"18px 0"}}>请先输入学生数据</p>
          </div>
          <div id="a4-container" className="a4-container"></div>
        </div>
      </section>
    </main>
  );
}

const css = `
:root{ --bg:#f7f7fb; --card:#fff; --text:#1f2330; --ring:#d9d6f5; --brand:#6d5bd0; --brand-2:#8a79ff; }
.container{max-width:1200px;margin:24px auto;padding:0 16px;}
.card{background:var(--card);border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.06);padding:22px 24px;margin-bottom:18px;border:1px solid rgba(109,91,208,.10);}
.grid-2{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;}
@media (max-width:960px){.grid-2{grid-template-columns:1fr;}}
h3,h4{margin:0 0 12px;color:#4b3dbb;}
.button-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
button{padding:10px 16px;border-radius:999px;border:0;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06);}
.action-btn{background:linear-gradient(90deg,var(--brand),var(--brand-2));color:#fff;}
.upload-btn{background:linear-gradient(90deg,#357ABD,#4a90e2);color:#fff;}
.clear-btn{background:linear-gradient(90deg,#f0435c,#e11d48);color:#fff;}
.download-btn{background:linear-gradient(90deg,#ff6b35,#ff8c69);color:#fff;padding:12px 18px;}
.student-input-area,.region-input{width:100%;padding:12px 14px;border:1.5px solid var(--ring);border-radius:12px;background:#fbfaff;}
.tickets-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(5cm,1fr));gap:.35cm;margin-top:18px;}
.ticket{width:5cm;height:10cm;position:relative;border-radius:18px;overflow:hidden;color:#fff;background:linear-gradient(135deg,#5f4ccf,#9b82d1);}
.logo-container{position:absolute;top:42px;left:50%;transform:translateX(-50%);width:98px;height:98px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;overflow:hidden;}
.logo{max-width:130px;max-height:130px;object-fit:contain;}
.default-logo{font-size:26px;color:rgba(255,255,255,.92);font-weight:800;}
.info-overlay{position:absolute;left:50%;transform:translateX(-50%);bottom:26px;width:86%;background:#fff;padding:12px;border-radius:12px;color:#111827;}
.info-row{display:flex;gap:10px;margin-bottom:8px;font-size:.9rem;}
.info-label{width:48px;font-weight:800;}
.info-value{flex:1;text-align:center;padding:6px 10px;border-radius:10px;background:#f7f4ff;border:1px solid #e6e1ff;}
.grade-header{grid-column:1/-1;text-align:center;font-weight:800;color:#3f51b5;margin:6px 0 0;padding:10px 0 12px;border-bottom:2px solid rgba(63,81,181,.2);}
.a4-container{display:none;}
@media print{
  body{background:#fff;padding:0;}
  .controls,.summary{display:none!important;}
  .a4-container{display:block;}
  .a4-page{box-shadow:none;margin:0 auto;padding:1cm;page-break-after:always;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;}
  .a4-page:last-child{page-break-after:auto;}
  .a4-ticket,.ticket{margin:.2cm;border:1px solid #000!important;box-shadow:none!important;justify-self:center;align-self:center;}
  .tickets-grid{display:none!important;}
  .ticket-with-bg{background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
}
`;
