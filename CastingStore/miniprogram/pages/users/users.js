import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { dateTime } from '../../utils/format';
import { confirm, toast } from '../../utils/ui';
const ROLE_KEYS = ['owner', 'operator', 'warehouse', 'finance', 'service'];
const ROLE_LABELS = ['老板', '运营', '仓库', '财务', '客服'];
Page({
    data: {
        loading: true,
        canManage: false,
        tab: 'users',
        list: [],
        roleKeys: ROLE_KEYS,
        roleLabels: ROLE_LABELS,
        newName: '',
        newOpenid: '',
        newRoleIndex: 1,
        logs: [],
    },
    onLoad(options) {
        if (options && options.tab === 'audit')
            this.setData({ tab: 'audit' });
    },
    onShow() {
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const canManage = can('user', 'read');
            this.setData({ canManage });
            if (!canManage)
                return;
            const res = await call('user.list');
            const list = (res.list || []).map((user) => ({
                ...user,
                roleIndex: Math.max(0, ROLE_KEYS.indexOf(user.role)),
                openid_short: user.openid ? `${user.openid.slice(0, 6)}…${user.openid.slice(-4)}` : '',
            }));
            const logsRes = await call('audit.list', { limit: 60 });
            const logs = (logsRes.list || []).map((log) => ({
                ...log,
                date_text: dateTime(log.created_at),
            }));
            this.setData({ list, logs });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onTab(e) {
        this.setData({ tab: e.currentTarget.dataset.tab });
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
    },
    onNewRole(e) {
        this.setData({ newRoleIndex: Number(e.detail.value) });
    },
    async onAdd() {
        if (!this.data.newName.trim()) {
            toast('请填写姓名');
            return;
        }
        if (!this.data.newOpenid.trim()) {
            toast('请填写对方 openid');
            return;
        }
        try {
            await call('user.save', {
                name: this.data.newName.trim(),
                openid: this.data.newOpenid.trim(),
                role: ROLE_KEYS[this.data.newRoleIndex],
                status: 'active',
            });
            toast('已添加', 'success');
            this.setData({ newName: '', newOpenid: '', newRoleIndex: 1 });
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onRoleChange(e) {
        const id = e.currentTarget.dataset.id;
        const roleIndex = Number(e.detail.value);
        const user = this.data.list.find((item) => item._id === id);
        if (!user)
            return;
        try {
            await call('user.save', {
                id,
                name: user.name,
                role: ROLE_KEYS[roleIndex],
                status: user.status,
            });
            toast('角色已更新', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onDelete(e) {
        const id = e.currentTarget.dataset.id;
        if (!(await confirm('删除账号', '删除后该微信号将无法使用系统。')))
            return;
        try {
            await call('user.remove', { id });
            toast('已删除', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
});
