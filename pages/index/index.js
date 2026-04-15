const {
  BRANDS,
  MATERIAL_TYPES,
  SERIES_OPTIONS,
  SUPPLIERS,
  SORT_FIELDS,
  SORT_ORDERS,
  COLOR_SWATCHES
} = require('../../utils/constants');

const STORAGE_KEY = 'filamentInventoryMiniapp';
const BACKUP_DIR = `${wx.env.USER_DATA_PATH}/filament-backups`;

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hour = `${now.getHours()}`.padStart(2, '0');
  const minute = `${now.getMinutes()}`.padStart(2, '0');
  const second = `${now.getSeconds()}`.padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function createEmptyForm() {
  return {
    id: '',
    brand: BRANDS[0],
    materialType: MATERIAL_TYPES[0],
    series: '',
    color: '',
    colorCode: '#ffffff',
    img: '',
    weight: '1.0',
    remain: '1000',
    alertLevel: '200',
    location: '',
    supplier: '',
    price: '',
    date: today()
  };
}

function normalizeItem(item) {
  return {
    id: item.id || `${Date.now()}`,
    brand: item.brand || '',
    materialType: item.materialType || '',
    series: item.series || '',
    color: item.color || '',
    colorCode: item.colorCode || '#ffffff',
    img: item.img || '',
    weight: `${item.weight || '1.0'}`,
    remain: `${item.remain || '0'}`,
    alertLevel: `${item.alertLevel || '200'}`,
    location: item.location || '',
    supplier: item.supplier || '',
    price: `${item.price || ''}`,
    date: item.date || today()
  };
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : `${value}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((item) => item.trim());
}

Page({
  data: {
    inventory: [],
    displayList: [],
    stats: {
      count: 0,
      totalValue: '0.00',
      lowStock: 0
    },
    searchKeyword: '',
    brandFilters: ['所有品牌'],
    seriesFilters: ['所有系列'],
    filterBrandIndex: 0,
    filterSeriesIndex: 0,
    sortFieldIndex: 0,
    sortOrderIndex: 0,
    sortFieldLabels: SORT_FIELDS.map((item) => item.label),
    sortOrderLabels: SORT_ORDERS.map((item) => item.label),
    brands: BRANDS,
    materialTypes: MATERIAL_TYPES,
    formSeriesOptions: ['未设置'].concat(SERIES_OPTIONS),
    formSupplierOptions: ['未选择'].concat(SUPPLIERS),
    colorSwatches: COLOR_SWATCHES,
    showEditor: false,
    editingId: '',
    form: createEmptyForm(),
    formBrandIndex: 0,
    formMaterialTypeIndex: 0,
    formSeriesIndex: 0,
    formSupplierIndex: 0
  },

  onLoad() {
    this.loadInventory();
  },

  loadInventory() {
    const stored = wx.getStorageSync(STORAGE_KEY) || [];
    const inventory = Array.isArray(stored) ? stored.map(normalizeItem) : [];
    this.setData({ inventory });
    this.refreshView();
  },

  persistInventory(inventory) {
    wx.setStorageSync(STORAGE_KEY, inventory);
    this.setData({ inventory });
    this.refreshView();
  },

  refreshView() {
    const inventory = (this.data.inventory || []).map(normalizeItem);
    const brandFilters = ['所有品牌'].concat([...new Set(inventory.map((item) => item.brand).filter(Boolean))]);
    const seriesFilters = ['所有系列'].concat([...new Set(inventory.map((item) => item.series).filter(Boolean))]);
    const currentBrand = brandFilters[this.data.filterBrandIndex] || '所有品牌';
    const currentSeries = seriesFilters[this.data.filterSeriesIndex] || '所有系列';
    const filterBrandIndex = Math.max(0, brandFilters.indexOf(currentBrand));
    const filterSeriesIndex = Math.max(0, seriesFilters.indexOf(currentSeries));
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase();
    const brandValue = brandFilters[filterBrandIndex] || '所有品牌';
    const seriesValue = seriesFilters[filterSeriesIndex] || '所有系列';
    const sortField = SORT_FIELDS[this.data.sortFieldIndex].value;
    const sortOrder = SORT_ORDERS[this.data.sortOrderIndex].value;

    const displayList = inventory
      .filter((item) => {
        const searchPool = [
          item.brand,
          item.materialType,
          item.series,
          item.color,
          item.location,
          item.supplier
        ].join(' ').toLowerCase();

        const matchKeyword = !keyword || searchPool.includes(keyword);
        const matchBrand = brandValue === '所有品牌' || item.brand === brandValue;
        const matchSeries = seriesValue === '所有系列' || item.series === seriesValue;
        return matchKeyword && matchBrand && matchSeries;
      })
      .sort((left, right) => {
        if (sortField === 'default') {
          return Number(right.id) - Number(left.id);
        }

        let leftValue = left[sortField];
        let rightValue = right[sortField];

        if (sortField === 'date') {
          leftValue = leftValue ? new Date(leftValue).getTime() : 0;
          rightValue = rightValue ? new Date(rightValue).getTime() : 0;
        }

        if (sortField === 'price' || sortField === 'remain') {
          leftValue = Number(leftValue) || 0;
          rightValue = Number(rightValue) || 0;
        }

        if (typeof leftValue === 'string' && typeof rightValue === 'string') {
          const compareResult = leftValue.localeCompare(rightValue, 'zh-Hans-CN');
          return sortOrder === 'asc' ? compareResult : -compareResult;
        }

        return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      })
      .map((item) => {
        const remain = Number(item.remain) || 0;
        const alertLevel = Number(item.alertLevel) || 0;
        return {
          ...item,
          lowStock: alertLevel > 0 && remain < alertLevel,
          seriesText: item.series || '未设置系列',
          supplierText: item.supplier || '未填写',
          locationText: item.location || '未填写',
          priceText: Number(item.price || 0).toFixed(2),
          dateText: item.date || '未填写'
        };
      });

    const totalValue = inventory.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const lowStock = inventory.filter((item) => (Number(item.alertLevel) || 0) > (Number(item.remain) || 0)).length;

    this.setData({
      inventory,
      displayList,
      brandFilters,
      seriesFilters,
      filterBrandIndex,
      filterSeriesIndex,
      stats: {
        count: inventory.length,
        totalValue: totalValue.toFixed(2),
        lowStock
      }
    });
  },

  onSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value }, () => this.refreshView());
  },

  onBrandFilterChange(event) {
    this.setData({ filterBrandIndex: Number(event.detail.value) }, () => this.refreshView());
  },

  onSeriesFilterChange(event) {
    this.setData({ filterSeriesIndex: Number(event.detail.value) }, () => this.refreshView());
  },

  onSortFieldChange(event) {
    this.setData({ sortFieldIndex: Number(event.detail.value) }, () => this.refreshView());
  },

  onSortOrderChange(event) {
    this.setData({ sortOrderIndex: Number(event.detail.value) }, () => this.refreshView());
  },

  openCreate() {
    this.setData({
      showEditor: true,
      editingId: '',
      form: createEmptyForm(),
      formBrandIndex: 0,
      formMaterialTypeIndex: 0,
      formSeriesIndex: 0,
      formSupplierIndex: 0
    });
  },

  openEdit(event) {
    const targetId = event.currentTarget.dataset.id;
    const current = this.data.inventory.find((item) => `${item.id}` === `${targetId}`);
    if (!current) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }

    const form = normalizeItem(current);
    this.setData({
      showEditor: true,
      editingId: `${form.id}`,
      form,
      formBrandIndex: Math.max(0, BRANDS.indexOf(form.brand)),
      formMaterialTypeIndex: Math.max(0, MATERIAL_TYPES.indexOf(form.materialType)),
      formSeriesIndex: Math.max(0, [''].concat(SERIES_OPTIONS).indexOf(form.series)),
      formSupplierIndex: Math.max(0, [''].concat(SUPPLIERS).indexOf(form.supplier))
    });
  },

  closeEditor() {
    this.setData({ showEditor: false });
  },

  onFieldInput(event) {
    const { field } = event.currentTarget.dataset;
    const { value } = event.detail;
    this.setData({
      [`form.${field}`]: value
    });
  },

  onBrandChange(event) {
    const formBrandIndex = Number(event.detail.value);
    this.setData({
      formBrandIndex,
      'form.brand': BRANDS[formBrandIndex]
    });
  },

  onMaterialTypeChange(event) {
    const formMaterialTypeIndex = Number(event.detail.value);
    this.setData({
      formMaterialTypeIndex,
      'form.materialType': MATERIAL_TYPES[formMaterialTypeIndex]
    });
  },

  onSeriesChange(event) {
    const formSeriesIndex = Number(event.detail.value);
    this.setData({
      formSeriesIndex,
      'form.series': formSeriesIndex === 0 ? '' : SERIES_OPTIONS[formSeriesIndex - 1]
    });
  },

  onSupplierChange(event) {
    const formSupplierIndex = Number(event.detail.value);
    this.setData({
      formSupplierIndex,
      'form.supplier': formSupplierIndex === 0 ? '' : SUPPLIERS[formSupplierIndex - 1]
    });
  },

  onDateChange(event) {
    this.setData({ 'form.date': event.detail.value });
  },

  selectColor(event) {
    this.setData({ 'form.colorCode': event.currentTarget.dataset.color });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        const fs = wx.getFileSystemManager();
        const suffix = (file.tempFilePath.split('.').pop() || 'jpg').toLowerCase();
        const mimeType = suffix === 'png' ? 'image/png' : suffix === 'webp' ? 'image/webp' : 'image/jpeg';
        fs.readFile({
          filePath: file.tempFilePath,
          encoding: 'base64',
          success: ({ data }) => {
            this.setData({
              'form.img': `data:${mimeType};base64,${data}`
            });
          },
          fail: () => {
            wx.showToast({ title: '图片读取失败', icon: 'none' });
          }
        });
      }
    });
  },

  removeImage() {
    this.setData({ 'form.img': '' });
  },

  previewImage(event) {
    const src = event.currentTarget.dataset.src;
    if (!src) {
      return;
    }
    wx.previewImage({ urls: [src], current: src });
  },

  previewEditorImage() {
    if (!this.data.form.img) {
      return;
    }
    wx.previewImage({ urls: [this.data.form.img], current: this.data.form.img });
  },

  saveItem() {
    const form = normalizeItem(this.data.form);

    if (!form.brand || !form.materialType || !form.color) {
      wx.showToast({ title: '请先填写必填项', icon: 'none' });
      return;
    }

    if (!form.weight || !form.remain) {
      wx.showToast({ title: '规格和剩余重量不能为空', icon: 'none' });
      return;
    }

    const inventory = [...this.data.inventory];
    const nextItem = {
      ...form,
      id: this.data.editingId || `${Date.now()}`
    };

    const targetIndex = inventory.findIndex((item) => `${item.id}` === `${nextItem.id}`);
    if (targetIndex >= 0) {
      inventory.splice(targetIndex, 1, nextItem);
    } else {
      inventory.unshift(nextItem);
    }

    this.persistInventory(inventory);
    this.setData({ showEditor: false });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  deleteItem(event) {
    const targetId = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除确认',
      content: '确定删除这条耗材记录吗？',
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        const inventory = this.data.inventory.filter((item) => `${item.id}` !== `${targetId}`);
        this.persistInventory(inventory);
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  confirmClear() {
    wx.showModal({
      title: '清空确认',
      content: '这会删除本机缓存中的全部库存数据，且不可恢复。',
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }
        this.persistInventory([]);
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  },

  openMoreActions() {
    wx.showActionSheet({
      itemList: ['备份 JSON', '恢复 JSON', '导入 CSV', '导出 CSV'],
      success: ({ tapIndex }) => {
        const handlers = [
          () => this.backupJson(),
          () => this.restoreJson(),
          () => this.importCsv(),
          () => this.exportCsv()
        ];
        const handler = handlers[tapIndex];
        if (handler) {
          handler();
        }
      }
    });
  },

  ensureBackupDir() {
    const fs = wx.getFileSystemManager();
    try {
      fs.accessSync(BACKUP_DIR);
    } catch (error) {
      fs.mkdirSync(BACKUP_DIR, true);
    }
  },

  backupJson() {
    if (!this.data.inventory.length) {
      wx.showToast({ title: '暂无数据可备份', icon: 'none' });
      return;
    }

    try {
      this.ensureBackupDir();
      const filePath = `${BACKUP_DIR}/filament-backup-${timestamp()}.json`;
      const content = JSON.stringify(this.data.inventory, null, 2);
      wx.getFileSystemManager().writeFileSync(filePath, content, 'utf8');
      wx.setClipboardData({ data: filePath });
      wx.showModal({
        title: '备份成功',
        content: `已写入小程序沙盒文件，并将路径复制到剪贴板。\n${filePath}`,
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: '备份失败', icon: 'none' });
    }
  },

  restoreJson() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: ({ tempFiles }) => {
        const file = tempFiles[0];
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: ({ data }) => {
            try {
              const parsed = JSON.parse(data);
              if (!Array.isArray(parsed)) {
                throw new Error('invalid');
              }
              const inventory = parsed.map(normalizeItem);
              this.persistInventory(inventory);
              wx.showToast({ title: '恢复成功', icon: 'success' });
            } catch (error) {
              wx.showToast({ title: 'JSON 格式错误', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '读取文件失败', icon: 'none' });
          }
        });
      }
    });
  },

  importCsv() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv'],
      success: ({ tempFiles }) => {
        const file = tempFiles[0];
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: ({ data }) => {
            const rows = data.replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean);
            if (rows.length <= 1) {
              wx.showToast({ title: 'CSV 无有效数据', icon: 'none' });
              return;
            }

            const header = parseCsvLine(rows[0]);
            const items = rows.slice(1).map((line, index) => {
              const cells = parseCsvLine(line);
              const row = {};
              header.forEach((key, cellIndex) => {
                row[key] = cells[cellIndex] || '';
              });
              return normalizeItem({
                id: `${Date.now()}-${index}`,
                brand: row['品牌'] || row.brand,
                materialType: row['材质类型'] || row.materialType,
                series: row['材质系列'] || row.series,
                color: row['颜色'] || row.color,
                colorCode: row['色值'] || row.colorCode || '#ffffff',
                weight: row['规格(kg)'] || row.weight || '1.0',
                remain: row['剩余(g)'] || row.remain || '1000',
                alertLevel: row['预警值'] || row.alertLevel || '200',
                location: row['位置'] || row.location,
                supplier: row['购买渠道'] || row.supplier,
                price: row['单价(元)'] || row.price || '',
                date: row['购入日期'] || row.date || today(),
                img: ''
              });
            });

            const inventory = items.concat(this.data.inventory);
            this.persistInventory(inventory);
            wx.showToast({ title: `导入 ${items.length} 条`, icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '读取 CSV 失败', icon: 'none' });
          }
        });
      }
    });
  },

  exportCsv() {
    if (!this.data.inventory.length) {
      wx.showToast({ title: '无数据可导出', icon: 'none' });
      return;
    }

    try {
      this.ensureBackupDir();
      const filePath = `${BACKUP_DIR}/filament-export-${timestamp()}.csv`;
      const header = ['品牌', '材质类型', '材质系列', '颜色', '色值', '规格(kg)', '剩余(g)', '预警值', '位置', '购买渠道', '单价(元)', '购入日期'];
      const rows = this.data.inventory.map((item) => [
        item.brand,
        item.materialType,
        item.series,
        item.color,
        item.colorCode,
        item.weight,
        item.remain,
        item.alertLevel,
        item.location,
        item.supplier,
        item.price,
        item.date
      ]);
      const content = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
      wx.getFileSystemManager().writeFileSync(filePath, `\ufeff${content}`, 'utf8');
      wx.setClipboardData({ data: filePath });
      wx.showModal({
        title: '导出成功',
        content: `CSV 已写入小程序沙盒文件，并将路径复制到剪贴板。\n${filePath}`,
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  }
});