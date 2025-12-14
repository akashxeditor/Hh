                           <script>
        // --- গ্লোবাল ভেরিয়েবল ---
        let adminAvatar = "https://via.placeholder.com/36";
        let allData = [];
        let currentItem = null;

        // আপনার Supabase ফাংশন লিংক
        const API_URL = "https://ambylxvsxgxfgzpxzwpr.supabase.co/functions/v1/bright-worker";

        // --- ১. সিস্টেম শুরু (ডাটা লোড) ---
        async function initSystem() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error("Server Error");

                const result = await response.json();
                
                // ১.১ অবতার সেট করা
                if(result.avatar) {
                    adminAvatar = result.avatar;
                    document.querySelectorAll('.channel-icon').forEach(img => img.src = adminAvatar);
                }

                // ১.২ প্রম্পট ডাটা প্রসেস করা
                const data = result.prompts;
                allData = [];
                if (data) {
                    Object.keys(data).forEach(key => allData.push({ id: key, ...data[key] }));
                    allData.reverse();
                    
                    renderGrid(allData, 'contentGrid');
                    renderGrid(allData.filter(d => parseFloat(d.rating) >= 4.5), 'trendingGrid');
                    checkDeepLink();
                } else {
                    document.getElementById('contentGrid').innerHTML = "<p style='text-align:center'>No Data Found</p>";
                }

            } catch (error) {
                console.error("Load Error:", error);
                document.getElementById('contentGrid').innerHTML = `<p style='text-align:center;color:red'>Failed to load data.</p>`;
            }
        }

        // --- ২. কমেন্ট পোস্ট ফাংশন (নতুন) ---
        document.getElementById('postComment').addEventListener('click', async () => {
            const txtInput = document.getElementById('commentInput');
            const txt = txtInput.value;
            const btn = document.getElementById('postComment');

            if (currentItem && txt) {
                // ইউজারকে ফিডব্যাক দেওয়া
                btn.innerText = "Posting...";
                btn.disabled = true;

                try {
                    // Supabase-এ কমেন্ট পাঠানো (POST Request)
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            itemId: currentItem.id,
                            text: txt
                        })
                    });

                    if (!response.ok) throw new Error("Post failed");

                    // সফল হলে লোকালে অ্যাড করে দেখানো (রিলোড ছাড়া)
                    const cBox = document.getElementById('modalComments');
                    const noComMsg = cBox.querySelector('p');
                    if(noComMsg && noComMsg.innerText === "No comments yet.") noComMsg.remove();

                    cBox.innerHTML += `<div style="border-bottom:1px dashed var(--border-color); padding:5px 0; margin-bottom:5px;">
                        <span style="color:var(--accent-color); font-weight:bold;">You:</span> ${txt}
                    </div>`;
                    
                    // স্ক্রল নিচে নামানো
                    cBox.scrollTop = cBox.scrollHeight;

                    txtInput.value = "";
                    alert("Comment Posted Successfully!");

                } catch (error) {
                    alert("Error posting comment: " + error.message);
                } finally {
                    btn.innerText = "Post";
                    btn.disabled = false;
                }
            }
        });

        // --- ৩. গ্রিড রেন্ডারার ---
        function renderGrid(list, containerId) {
            const container = document.getElementById(containerId);
            container.innerHTML = "";
            list.forEach(item => {
                const timeStr = timeAgo(item.timestamp);
                const card = document.createElement('div');
                card.className = 'card';
                card.onclick = () => openModal(item, timeStr);
                card.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${item.imgLink}" class="card-img" onerror="this.src='https://via.placeholder.com/480x270'">
                    </div>
                    <div class="card-meta">
                        <img src="${adminAvatar}" class="channel-icon">
                        <div class="text-info">
                            <div class="card-title">${item.title}</div>
                            <div class="card-subtitle">Rating: ${item.rating} • ${timeStr}</div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        };

        // --- ৪. ইউটিলিটি ---
        function timeAgo(ts) {
            if(!ts) return "Recently";
            const sec = Math.floor((Date.now()-ts)/1000);
            if(sec>86400) return Math.floor(sec/86400) + " days ago";
            if(sec>3600) return Math.floor(sec/3600) + " hours ago";
            if(sec>60) return Math.floor(sec/60) + " mins ago";
            return "Just now";
        }

        // --- ৫. মোডাল ---
        function openModal(item, time) {
            currentItem = item;
            document.getElementById('modalImg').src = item.imgLink;
            document.getElementById('modalTitle').innerText = item.title;
            document.getElementById('modalPrompt').innerText = item.prompt;
            document.getElementById('modalMeta').innerText = `Posted: ${time} • Rating: ${item.rating}`;
            
            const slug = item.title.trim().replace(/\s+/g, '-');
            const newUrl = `?view=${encodeURIComponent(slug)}`;
            window.history.pushState({modalOpen: true, itemId: item.id}, "", newUrl);

            const cBox = document.getElementById('modalComments');
            cBox.innerHTML = "";
            if(item.comments) {
                Object.values(item.comments).forEach(c => {
                    cBox.innerHTML += `<div style="border-bottom:1px dashed var(--border-color); padding:5px 0; margin-bottom:5px;">
                        <span style="color:var(--accent-color); font-weight:bold;">Visitor:</span> ${c.text}
                    </div>`;
                });
            } else cBox.innerHTML = "<p>No comments yet.</p>";

            document.getElementById('detailModal').style.display = 'block';
            saveHistory(item);
        }

        function closeModal() {
            if (window.location.search.includes("view=")) window.history.back();
            else document.getElementById('detailModal').style.display = 'none';
        }
        window.onpopstate = () => document.getElementById('detailModal').style.display = 'none';

        function checkDeepLink() {
            const urlParams = new URLSearchParams(window.location.search);
            const viewSlug = urlParams.get('view');
            if (viewSlug) {
                const decodedSlug = decodeURIComponent(viewSlug);
                const targetItem = allData.find(item => {
                    const itemSlug = item.title.trim().replace(/\s+/g, '-');
                    return itemSlug === decodedSlug;
                });
                if (targetItem) setTimeout(() => openModal(targetItem, timeAgo(targetItem.timestamp)), 500);
            }
        }

        // --- ৬. অ্যাকশন বাটন ---
        function copyPrompt() {
            navigator.clipboard.writeText(document.getElementById('modalPrompt').innerText);
            alert("Copied!");
        }
        async function shareItem() {
            if(!currentItem) return;
            const data = { title: currentItem.title, text: `Check this AI Art!\n${currentItem.title}\n${window.location.href}`, url: window.location.href };
            try { await navigator.share(data); } catch { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
        }

        // --- ৭. সেটিংস ও অন্যান্য ---
        function saveHistory(item) {
            let hist = JSON.parse(localStorage.getItem('hist')) || [];
            hist = hist.filter(h => h.id !== item.id);
            hist.unshift(item);
            localStorage.setItem('hist', JSON.stringify(hist));
        }
        
        function openThemeSelector() { document.getElementById('themeModal').classList.add('active'); }
        function closeThemeSelector() { document.getElementById('themeModal').classList.remove('active'); }
        function setTheme(t) { document.body.className = t; localStorage.setItem('theme', t); closeThemeSelector(); }
        document.body.className = localStorage.getItem('theme') || 'theme-gradient';

        function openHistoryPage() { showPage('historyPage'); renderGrid(JSON.parse(localStorage.getItem('hist'))||[], 'historyGrid'); }
        function shareApp() { navigator.clipboard.writeText(window.location.href); alert("App Link Copied!"); }

        function switchTab(id, el) {
            document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
            el.classList.add('active');
        }
        function showPage(id) {
            document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }

        const sInput = document.getElementById('searchInput');
        const sBox = document.getElementById('suggestionsBox');
        sInput.addEventListener('input', function() {
            const val = this.value.toLowerCase();
            sBox.innerHTML = "";
            if(!val) { sBox.style.display='none'; renderGrid(allData, 'contentGrid'); return; }
            const filtered = allData.filter(d => d.title.toLowerCase().includes(val));
            if(filtered.length > 0) {
                sBox.style.display='block';
                filtered.slice(0,5).forEach(item => {
                    const d = document.createElement('div');
                    d.className='suggestion-item'; d.innerText=item.title;
                    d.onclick = () => { sInput.value=item.title; renderGrid([item], 'contentGrid'); sBox.style.display='none'; };
                    sBox.appendChild(d);
                });
            } else sBox.style.display='none';
            if(document.getElementById('homePage').classList.contains('active')) renderGrid(filtered, 'contentGrid');
        });
        document.onclick=(e)=>{ if(!e.target.closest('.search-container')) sBox.style.display='none'; }

        // Start
        initSystem();

                           </script>
