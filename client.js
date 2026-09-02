window.__ModuleLoader__.load({
	id: "skill-evolution",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const h = React.createElement;
		const { useCallback, useEffect, useMemo, useRef, useState } = React;

		const CHANNEL = "/skill-evolution";

		const CSS = `
.dse-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}
.dse-head{align-items:flex-start;gap:10px;justify-content:space-between;display:flex}
.dse-head h3{margin:0;font-size:15px;font-weight:600;line-height:22px}
.dse-headTexts{flex-direction:column;gap:2px;display:flex;min-width:0}
.dse-sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dse-actions{align-items:center;gap:8px;display:flex;flex:none}
.dse-btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer;background:0 0;border-radius:6px;align-items:center;gap:5px;padding:4px 10px;display:inline-flex}
.dse-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dse-btn[data-danger=true]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}
.dse-btn[data-danger=true]:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}
.dse-btn[data-primary=true]{color:var(--dsw-alias-state-business-primary)}
.dse-btn:disabled{opacity:.55;cursor:default}
.dse-note{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:8px 10px;font-size:12px;line-height:18px}
.dse-chips{flex-wrap:wrap;gap:6px;display:flex}
.dse-chip{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:5px;padding:1px 7px;font-size:11px;line-height:18px;display:inline-flex}
.dse-chip[data-kind=on]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary);border-color:transparent}
.dse-chip[data-kind=off]{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);color:var(--dsw-alias-state-error-primary);border-color:transparent}
.dse-chip[data-kind=tool]{font-family:var(--ds-font-family-code)}
.dse-chip[data-kind=hot]{background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b45309) 12%, transparent);color:var(--dsw-alias-state-warning-primary,#b45309);border-color:transparent}
.dse-catalog{flex-direction:column;gap:10px;display:flex}
.dse-catalogHeading{align-items:baseline;gap:7px;display:flex}
.dse-catalogHeading h4{margin:0;font-size:13px;font-weight:600}
.dse-catalogHeading span{color:var(--dsw-alias-label-tertiary);font-size:12px;font-variant-numeric:tabular-nums}
.dse-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;overflow:hidden}
.dse-card[data-open=true]{border-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-shadow-lv1)}
.dse-cardHead{width:100%;min-height:52px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;display:flex}
.dse-cardHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dse-cardTitle{min-width:0;flex-direction:column;gap:2px;display:flex}
.dse-name{text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;overflow:hidden}
.dse-desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dse-cardTrailing{color:var(--dsw-alias-label-tertiary);align-items:center;gap:8px;display:inline-flex;flex:none;font-size:11.5px;font-variant-numeric:tabular-nums}
.dse-dot{background:var(--dsw-alias-label-tertiary);border-radius:999px;width:7px;height:7px;flex:none;display:inline-block}
.dse-dot[data-on=true]{background:var(--dsw-alias-state-success-primary)}
.dse-dot[data-on=false]{background:var(--dsw-alias-label-tertiary);opacity:.5}
.dse-chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .15s var(--ds-ease-in-out)}
.dse-card[data-open=true] .dse-chevron{transform:rotate(180deg)}
.dse-cardBody{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);flex-direction:column;gap:10px;padding:12px 14px;display:flex}
.dse-metaRow{align-items:baseline;gap:6px;flex-wrap:wrap;display:flex;color:var(--dsw-alias-label-tertiary);font-size:11.5px}
.dse-content{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;border-radius:8px;margin:0;max-height:380px;overflow:auto;padding:10px 12px;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px}
.dse-cardActions{justify-content:flex-end;gap:8px;display:flex}
.dse-empty{border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);border-radius:10px;flex-direction:column;gap:6px;padding:22px 18px;display:flex;font-size:12.5px;line-height:19px;text-align:center;align-items:center}
.dse-empty b{color:var(--dsw-alias-label-secondary)}
.dse-status{color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:20px}
.dse-failure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex;font-size:12.5px}
.dse-modelConfig{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:10px;padding:10px 14px;display:flex}
.dse-modelTitle{color:var(--dsw-alias-label-secondary);font-size:12.5px;font-weight:500}
.dse-modelRow{align-items:flex-end;gap:10px;flex-wrap:wrap;display:flex}
.dse-modelField{flex-direction:column;gap:4px;min-width:180px;flex:1;display:flex}
.dse-modelField>span{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dse-input,.dse-select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);height:30px;font:inherit;font-size:13px;border-radius:6px;padding:0 8px;width:100%}
.dse-input:focus,.dse-select:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.dse-modelActions{align-items:center;gap:8px;flex-wrap:wrap;display:flex}
.dse-btn[data-primary=true]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
.dse-btn[data-primary=true]:disabled{opacity:.45;cursor:default}
.dse-btn:disabled{opacity:.45;cursor:default}
.dse-modelSaved{color:var(--dsw-alias-state-success-primary);margin:0;font-size:12px}
.dse-modelHint{color:var(--dsw-alias-label-tertiary);font-size:11px}
.dse-patterns{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;flex-direction:column;gap:8px;padding:10px 14px;display:flex}
.dse-patterns summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12.5px;user-select:none}
.dse-patternRow{align-items:center;gap:8px;flex-wrap:wrap;display:flex;font-size:11.5px;color:var(--dsw-alias-label-tertiary)}
.dse-patternRow .dse-chip[data-kind=tool]{font-size:10.5px}
@media (width<=680px){.dse-head{flex-direction:column}}
`;

		function rpcId() {
			try {
				return crypto.randomUUID();
			} catch {
				return "rpc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
			}
		}

		async function rpc(endpoint, args) {
			const response = await fetch(CHANNEL + "/" + endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId: rpcId(),
					method: endpoint,
					payload: { args: args || {} }
				})
			});
			if (!response.ok) throw new Error("HTTP " + response.status);
			const envelope = await response.json();
			const result = envelope && envelope.result;
			if (!result || result.ok !== true) {
				const error = result && result.error;
				throw new Error(error ? error.message : "request failed");
			}
			return result.value;
		}

		function fmtTime(iso) {
			if (typeof iso !== "string" || iso.length === 0) return "-";
			try {
				const d = new Date(iso);
				const pad = (n) => String(n).padStart(2, "0");
				return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
			} catch {
				return iso;
			}
		}

		function pct(rate) {
			return Math.round((typeof rate === "number" ? rate : 0) * 100) + "%";
		}

		function Chevron() {
			return h("svg", { className: "dse-chevron", width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
				h("path", { d: "M3 6l5 5 5-5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		function ToolChips({ sequence, max }) {
			const tools = Array.isArray(sequence) ? sequence : [];
			const limit = max || 6;
			const shown = tools.slice(0, limit);
			const rest = tools.length - shown.length;
			return h("span", { className: "dse-chips" },
				shown.map((tool, i) => h("span", { key: i + ":" + tool, className: "dse-chip", "data-kind": "tool" }, tool)),
				rest > 0 ? h("span", { key: "rest", className: "dse-chip" }, "+" + rest) : null);
		}

		function SkillCard({ summary, onRemoved }) {
			const [open, setOpen] = useState(false);
			const [detail, setDetail] = useState(undefined);
			const [detailError, setDetailError] = useState(undefined);
			const [confirming, setConfirming] = useState(false);
			const [busy, setBusy] = useState(false);
			const confirmTimer = useRef(undefined);

			useEffect(() => () => clearTimeout(confirmTimer.current), []);

			const toggle = useCallback(() => {
				setOpen((prev) => {
					const next = !prev;
					if (next && detail === undefined && detailError === undefined) {
						rpc("get", { name: summary.name })
							.then((value) => setDetail(value))
							.catch((error) => setDetailError(String(error.message || error)));
					}
					return next;
				});
			}, [detail, detailError, summary.name]);

			const askRemove = useCallback(() => {
				if (!confirming) {
					setConfirming(true);
					clearTimeout(confirmTimer.current);
					confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
					return;
				}
				clearTimeout(confirmTimer.current);
				setBusy(true);
				rpc("remove", { name: summary.name })
					.then(() => onRemoved(summary.name))
					.catch(() => setBusy(false));
			}, [confirming, onRemoved, summary.name]);

			return h("div", { className: "dse-card", "data-open": open },
				h("button", { type: "button", className: "dse-cardHead", onClick: toggle, "aria-expanded": open },
					h("span", { className: "dse-cardTitle" },
						h("span", { className: "dse-name" }, summary.name),
						summary.description ? h("span", { className: "dse-desc" }, summary.description) : null),
					h("span", { className: "dse-cardTrailing" },
						h("span", { className: "dse-dot", "data-on": summary.registered, title: summary.registered ? "已注册到技能目录" : "未注册（autoRegister 关闭）" }),
						"v" + summary.version + " · " + summary.occurrences + "次" + (summary.improvements ? " · 改进" + summary.improvements + "次" : ""),
						h(Chevron))),
				open ? h("div", { className: "dse-cardBody" },
					Array.isArray(summary.signals) && summary.signals.length > 0
						? h("div", { className: "dse-metaRow" },
							h("span", {}, "结晶信号"),
							h("span", { className: "dse-chips" }, summary.signals.map((s, i) => h("span", { key: i, className: "dse-chip", "data-kind": "on" }, s))))
						: null,
					h("div", { className: "dse-metaRow" },
						h("span", {}, "工具序列"),
						h(ToolChips, { sequence: summary.toolSequence })),
					h("div", { className: "dse-metaRow" },
						h("span", {}, "创建于 " + fmtTime(summary.createdAt)),
						summary.updatedAt !== summary.createdAt ? h("span", {}, "· 更新于 " + fmtTime(summary.updatedAt)) : null,
						summary.sourcePatternId ? h("span", {}, "· 来源 " + summary.sourcePatternId) : null),
					detailError !== undefined
						? h("div", { className: "dse-failure" }, "加载内容失败：" + detailError)
						: h("pre", { className: "dse-content" }, detail === undefined ? "加载中…" : detail.content),
					h("div", { className: "dse-cardActions" },
						h("button", {
							type: "button",
							className: "dse-btn",
							"data-danger": true,
							disabled: busy,
							onClick: askRemove
						}, busy ? "删除中…" : confirming ? "再次点击确认删除" : "删除此技能"))) : null);
		}

		function PatternList({ stats, config }) {
			const patterns = stats && Array.isArray(stats.patterns) ? stats.patterns : [];
			if (patterns.length === 0) {
				return h("div", { className: "dse-patterns" },
					h("div", { className: "dse-status" }, "实时观察：本进程还没有记录到任何完整回合的工具序列。"));
			}
			return h("details", { className: "dse-patterns" },
				h("summary", {}, "实时观察：" + (stats.totalTraces || 0) + " 个已统计回合 · " + patterns.length + " 种工具序列模式"),
				patterns.map((p) => h("div", { key: p.id, className: "dse-patternRow" },
					h(ToolChips, { sequence: p.toolSequence, max: 8 }),
					h("span", {}, p.occurrences + "/" + (config ? config.minPatternOccurrences : 3) + " 次 · " + pct(p.successRate)),
					p.crystallized
						? h("span", { className: "dse-chip", "data-kind": "on" }, "已结晶")
						: h("span", { className: "dse-chip", "data-kind": p.occurrences >= (config ? config.minPatternOccurrences : 3) ? "hot" : undefined }, "观察中"))));
		}

		function ModelConfig({ config, onChanged }) {
			const [provider, setProvider] = useState(config.llmProvider || "");
			const [model, setModel] = useState(config.llmModel || "");
			const [catalog, setCatalog] = useState(undefined);
			const [busy, setBusy] = useState(false);
			const [message, setMessage] = useState(undefined);
			const overridden = config.modelSource === "runtime";

			useEffect(() => {
				let cancelled = false;
				rpc("listModels")
					.then((data) => { if (!cancelled) setCatalog(data); })
					.catch(() => { if (!cancelled) setCatalog({ providers: [], modelsByProvider: {} }); });
				return () => { cancelled = true; };
			}, []);

			const providers = catalog && Array.isArray(catalog.providers) ? catalog.providers : [];
			const modelOptions = catalog && catalog.modelsByProvider ? (catalog.modelsByProvider[provider] || []) : [];
			const dirty = provider !== (config.llmProvider || "") || model !== (config.llmModel || "");

			const save = useCallback(() => {
				if (!provider.trim() || !model.trim()) {
					setMessage({ ok: false, text: "Provider 和 Model 不能为空" });
					return;
				}
				setBusy(true);
				setMessage(undefined);
				rpc("setModel", { provider: provider.trim(), model: model.trim() })
					.then(() => { setBusy(false); setMessage({ ok: true, text: "已保存，评审立即生效并持久化" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [provider, model, onChanged]);

			const reset = useCallback(() => {
				setBusy(true);
				setMessage(undefined);
				rpc("resetModel")
					.then((v) => { setBusy(false); setProvider(v.llmProvider); setModel(v.llmModel); setMessage({ ok: true, text: "已恢复为挂载配置的默认值" }); onChanged(); })
					.catch((e) => { setBusy(false); setMessage({ ok: false, text: String(e.message || e) }); });
			}, [onChanged]);

			return h("div", { className: "dse-modelConfig" },
				h("div", { className: "dse-modelTitle" }, "评审模型（结晶与改进评审使用的 LLM）"),
				h("div", { className: "dse-modelRow" },
					h("label", { className: "dse-modelField" },
						h("span", {}, "Provider"),
						providers.length > 0
							? h("select", { className: "dse-select", value: provider, onChange: (e) => setProvider(e.target.value) },
								providers.some((p) => p.id === provider) ? null : h("option", { value: provider }, provider),
								providers.map((p) => h("option", { key: p.id, value: p.id }, p.name && p.name !== p.id ? p.name + " (" + p.id + ")" : p.id)))
							: h("input", { className: "dse-input", value: provider, onChange: (e) => setProvider(e.target.value), placeholder: "provider id" })),
					h("label", { className: "dse-modelField" },
						h("span", {}, "Model"),
						h("input", { className: "dse-input", list: "dse-model-options", value: model, onChange: (e) => setModel(e.target.value), placeholder: "model id" }),
						h("datalist", { id: "dse-model-options" }, modelOptions.map((m) => h("option", { key: m.id, value: m.id })))),
					h("div", { className: "dse-modelActions" },
						h("button", { type: "button", className: "dse-btn", "data-primary": true, disabled: busy || !dirty, onClick: save }, busy ? "保存中…" : "保存"),
						overridden ? h("button", { type: "button", className: "dse-btn", disabled: busy, onClick: reset }, "恢复默认") : null)),
				message
					? h("p", { className: message.ok ? "dse-modelSaved" : "dse-failure" }, message.text)
					: overridden
						? h("p", { className: "dse-modelHint" }, "当前值来自本界面设置（持久化于 runtime-config.json，优先于挂载配置）")
						: h("p", { className: "dse-modelHint" }, "当前值来自挂载配置；在此保存后将持久化覆盖，重启后仍生效"));
		}

		function SkillEvolutionSection() {
			const [view, setView] = useState({ status: "loading" });
			const [confirmClear, setConfirmClear] = useState(false);
			const [busy, setBusy] = useState(false);
			const confirmTimer = useRef(undefined);

			useEffect(() => () => clearTimeout(confirmTimer.current), []);

			const load = useCallback(() => {
				setView({ status: "loading" });
				rpc("list")
					.then((data) => setView({ status: "ready", data }))
					.catch((error) => setView({ status: "error", message: String(error.message || error) }));
			}, []);

			useEffect(() => {
				load();
			}, [load]);

			const data = view.status === "ready" ? view.data : undefined;
			const skills = useMemo(() => (data && Array.isArray(data.skills) ? data.skills : []), [data]);
			const config = data && data.config;
			const stats = data && data.stats;

			const handleRemoved = useCallback(() => load(), [load]);

			const askClear = useCallback(() => {
				if (skills.length === 0) return;
				if (!confirmClear) {
					setConfirmClear(true);
					clearTimeout(confirmTimer.current);
					confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000);
					return;
				}
				clearTimeout(confirmTimer.current);
				setBusy(true);
				rpc("clear")
					.then(() => {
						setConfirmClear(false);
						load();
					})
					.catch(() => setBusy(false));
			}, [confirmClear, load, skills.length]);

			return h("div", { className: "dse-section" },
				h("style", {}, CSS),
				h("div", { className: "dse-head" },
					h("div", { className: "dse-headTexts" },
						h("h3", {}, "技能进化 · Skill Evolution"),
						h("p", { className: "dse-sub" }, "Hermes 式自进化：每个成功回合结束时按信号评审，把值得复用的工作流提炼为技能，并在后续使用中持续改进")),
					h("div", { className: "dse-actions" },
						h("button", { type: "button", className: "dse-btn", onClick: load, disabled: view.status === "loading" }, "刷新"))),
				view.status === "loading" ? h("p", { className: "dse-status" }, "加载中…") : null,
				view.status === "error" ? h("div", { className: "dse-failure" },
					h("p", {}, "无法读取进化技能：" + view.message),
					h("button", { type: "button", className: "dse-btn", onClick: load }, "重试")) : null,
				data ? h(React.Fragment, null,
					h("div", { className: "dse-chips" },
						h("span", { className: "dse-chip", "data-kind": config.autoRegister ? "on" : "off" },
							config.autoRegister ? "自动注册：开" : "自动注册：关"),
						config.signals && config.signals.complex ? h("span", { className: "dse-chip" }, "信号：复杂任务 ≥" + config.minToolCalls + " 次调用") : null,
						config.signals && config.signals.recovered ? h("span", { className: "dse-chip" }, "信号：从错误中恢复") : null,
						config.signals && config.signals.repeated ? h("span", { className: "dse-chip" }, "信号：序列重复 ≥" + config.minPatternOccurrences + " 次") : null,
						config.complexRequiresCorroboration ? h("span", { className: "dse-chip" }, "闸门：单独 complex 需佐证才送审") : null,
						h("span", { className: "dse-chip" }, "LLM：" + config.llmProvider + " / " + config.llmModel + (config.modelSource === "runtime" ? "（界面设置）" : "")),
						h("span", { className: "dse-chip" }, "容量：" + skills.length + "/" + config.maxEvolvedSkills)),
					h(ModelConfig, { config, onChanged: load }),
					h(PatternList, { stats, config }),
					h("div", { className: "dse-catalog" },
						h("div", { className: "dse-catalogHeading" },
							h("h4", {}, "已生成的技能"),
							h("span", {}, String(skills.length))),
						skills.length === 0
							? h("div", { className: "dse-empty" },
								h("div", {}, h("b", {}, "还没有进化技能")),
								h("div", {}, "每个成功回合结束时，插件按 Hermes 模型检测信号：复杂任务（≥" + config.minToolCalls + " 次工具调用）、"),
								h("div", {}, "从错误中恢复、或同一序列重复 ≥" + config.minPatternOccurrences + " 次。任一信号触发 LLM 评审，"),
								h("div", {}, "值得复用的工作流会被提炼为技能并注册；后续同类执行还会把新经验合并进已有技能（版本递增）。"),
								h("div", {}, "评审统计在本进程内存中进行，服务重启后重新累计；已生成的技能会持久保存。"))
							: skills.map((summary) => h(SkillCard, { key: summary.name, summary, onRemoved: handleRemoved })),
						skills.length > 0 ? h("div", { className: "dse-cardActions" },
							h("button", {
								type: "button",
								className: "dse-btn",
								"data-danger": true,
								disabled: busy,
								onClick: askClear
							}, busy ? "清空中…" : confirmClear ? "再次点击确认清空全部" : "清空全部（" + skills.length + "）")) : null)) : null);
		}

		const inject = ["slots"];

		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skill-evolution",
				order: 300,
				label: () => "技能进化"
			}, SkillEvolutionSection));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
