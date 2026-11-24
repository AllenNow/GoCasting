import { call, toastError } from '../../utils/api'
import { can } from '../../utils/auth'
import { back, toast } from '../../utils/ui'

Page({
  data: {
    loading: true,
    saving: false,
    allowed: false,
    product: null,
    warehouses: [],
    options: [],
    fromIndex: 0,
    toIndex: 1,
    available: 0,
    availableText: '0',
    qty: '',
    note: '',
  },

  async onLoad(options) {
    const allowed = can('inventory', 'transfer')
    this.setData({ allowed })
    if (!allowed) {
      this.setData({ loading: false })
      return
    }
    try {
      const res = await call('inventory.detail', { product_id: options.product_id })
      const stocks = {}
      ;(res.inventory || []).forEach((row) => {
        stocks[row.warehouse_id] = Number(row.qty_available || 0)
      })
      const warehouses = (res.warehouses || []).map((house) => ({
        ...house,
        qty: stocks[house._id] || 0,
      }))

      let fromIndex = 0
      for (let i = 0; i < warehouses.length; i += 1) {
        if (warehouses[i].qty > 0) {
          fromIndex = i
          break
        }
      }
      let toIndex = fromIndex === 0 ? 1 : 0
      if (!warehouses[toIndex]) toIndex = 0

      this.setData({
        product: res.product,
        warehouses,
        options: warehouses.map((house) => `${house.name}（可用 ${house.qty}）`),
        fromIndex,
        toIndex,
      })
      this.refreshAvailable()

      if (warehouses.length < 2) toast('至少需要两个仓库才能调拨')
    } catch (err) {
      toastError(err)
    } finally {
      this.setData({ loading: false })
    }
  },

  refreshAvailable() {
    const house = this.data.warehouses[this.data.fromIndex]
    const available = house ? house.qty : 0
    this.setData({ available, availableText: String(available) })
  },

  onFrom(e) {
    const fromIndex = Number(e.detail.value)
    let toIndex = this.data.toIndex
    if (toIndex === fromIndex) toIndex = fromIndex === 0 ? 1 : 0
    if (!this.data.warehouses[toIndex]) toIndex = fromIndex
    this.setData({ fromIndex, toIndex })
    this.refreshAvailable()
  },

  onTo(e) {
    this.setData({ toIndex: Number(e.detail.value) })
  },

  onQty(e) {
    this.setData({ qty: e.detail.value })
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
  },

  async onSubmit() {
    if (this.data.saving) return
    const amount = Number(this.data.qty)
    if (!(amount > 0)) {
      toast('请填写调拨数量')
      return
    }
    if (amount > this.data.available) {
      toast('调拨数量超过调出仓可用库存')
      return
    }
    if (this.data.fromIndex === this.data.toIndex) {
      toast('调出与调入仓库不能相同')
      return
    }
    const product = this.data.product
    const from = this.data.warehouses[this.data.fromIndex]
    const to = this.data.warehouses[this.data.toIndex]
    if (!product || !from || !to) {
      toast('仓库信息不完整')
      return
    }

    this.setData({ saving: true })
    try {
      await call('inventory.transfer', {
        product_id: product._id,
        from_warehouse_id: from._id,
        to_warehouse_id: to._id,
        qty: amount,
        note: this.data.note,
      })
      toast('调拨成功', 'success')
      setTimeout(() => back(), 400)
    } catch (err) {
      toastError(err)
    } finally {
      this.setData({ saving: false })
    }
  },
})
