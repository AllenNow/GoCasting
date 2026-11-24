import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { PLATFORMS } from '../../utils/config';
import { money } from '../../utils/format';
import { toast } from '../../utils/ui';
function currentPeriod() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function num(value) {
    const n = Number(value);
    return isFinite(n) ? n : 0;
}
Page({
    data: {
        allowed: false,
        canSave: false,
        loading: true,
        saving: false,
        touched: false,
        platforms: PLATFORMS,
        platformIndex: 0,
        period: currentPeriod(),
        systemAmount: '0.00',
        orderCount: 0,
        statement: '',
        reason: '',
        note: '',
        diff: '0.00',
        diffClass: 'tag-primary',
        diffLabel: '无差异',
        exists: false,
        list: [],
    },
    onLoad() {
        this.setData({
            allowed: can('settlement', 'read'),
            canSave: can('settlement', 'create'),
        });
    },
    onShow() {
        if (this.data.allowed)
            this.load();
    },
    async load(resetForm = false) {
        this.setData({ loading: true });
        try {
            const platform = this.data.platforms[this.data.platformIndex];
            const period = this.data.period;
            const preview = await call('settlement.preview', { platform, period });
            const listRes = await call('settlement.list', {});
            const list = (listRes.list || []).map((row) => ({
                ...row,
                statement_text: money(row.statement_amount),
                system_text: money(row.system_amount),
                diff_text: money(row.diff),
                diff_class: Math.abs(Number(row.diff || 0)) < 0.01 ? 'tag-primary' : 'tag-warn',
            }));
            const patch = {
                list,
                systemAmount: money(preview.system_amount),
                orderCount: preview.order_count || 0,
                exists: !!preview.existing,
            };
            if (resetForm || !this.data.touched) {
                const existing = preview.existing || {};
                patch.statement = existing.statement_amount === undefined ? '' : String(existing.statement_amount);
                patch.reason = existing.reason || '';
                patch.note = existing.note || '';
            }
            this.setData(patch);
            this.computeDiff();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    computeDiff() {
        const statement = num(this.data.statement);
        const system = Number(this.data.systemAmount) || 0;
        const diff = Math.round((statement - system) * 100) / 100;
        let diffLabel = '无差异';
        if (diff > 0.009)
            diffLabel = '平台结算高于系统';
        if (diff < -0.009)
            diffLabel = '平台结算低于系统';
        this.setData({
            diff: money(diff),
            diffClass: Math.abs(diff) < 0.01 ? 'tag-primary' : 'tag-warn',
            diffLabel,
        });
    },
    onPlatform(e) {
        this.setData({ platformIndex: Number(e.detail.value), touched: false });
        this.load(true);
    },
    onPeriod(e) {
        this.setData({ period: e.detail.value, touched: false });
        this.load(true);
    },
    onStatement(e) {
        this.setData({ statement: e.detail.value, touched: true });
        this.computeDiff();
    },
    onReason(e) {
        this.setData({ reason: e.detail.value, touched: true });
    },
    onNote(e) {
        this.setData({ note: e.detail.value, touched: true });
    },
    onPick(e) {
        const platform = e.currentTarget.dataset.platform;
        const period = e.currentTarget.dataset.period;
        const index = this.data.platforms.indexOf(platform);
        this.setData({
            platformIndex: index >= 0 ? index : 0,
            period,
            touched: false,
        });
        this.load(true);
    },
    async onSave() {
        if (this.data.saving)
            return;
        if (String(this.data.statement).trim() === '') {
            toast('请填写平台账单金额');
            return;
        }
        const diff = Math.abs(num(this.data.diff));
        if (diff >= 0.01 && !this.data.reason.trim()) {
            toast('存在差异，请填写差异原因');
            return;
        }
        this.setData({ saving: true });
        try {
            await call('settlement.save', {
                platform: this.data.platforms[this.data.platformIndex],
                period: this.data.period,
                statement_amount: this.data.statement,
                reason: this.data.reason,
                note: this.data.note,
            });
            toast('已保存', 'success');
            this.setData({ touched: false });
            await this.load(true);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
});
