/**
 * Productos CRUD Module
 * Módulo para gestión de productos/servicios con Supabase
 */

const getSupabaseForProducts = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};

const TAX_RATES = {
  IVA_21: 21, IVA_10: 10, IVA_4: 4, IVA_0: 0,
  IGIC_7: 7, IGIC_3: 3, IGIC_0: 0,
  EXENTO: 0
};

function getTaxRate(taxCode) {
  return TAX_RATES[taxCode] || 0;
}

function calcPVP(precioVenta, taxCode) {
  var rate = getTaxRate(taxCode);
  return precioVenta * (1 + rate / 100);
}

function calcMargen(precioCompra, precioVenta) {
  if (!precioVenta || precioVenta <= 0) return null;
  return ((precioVenta - precioCompra) / precioVenta) * 100;
}

async function createProduct(data) {
  try {
    if (window.planLimits) {
      var limitCheck = await window.planLimits.canCreateProduct();
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason);
      }
    }

    var supabase = getSupabaseForProducts();
    var { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Usuario no autenticado.');

    var row = {
      user_id: user.id,
      nombre: (data.nombre || '').trim(),
      referencia: (data.referencia || '').trim() || null,
      descripcion: (data.descripcion || '').trim() || null,
      precio_compra: parseFloat(data.precio_compra) || 0,
      precio_venta: parseFloat(data.precio_venta) || 0,
      impuesto: data.impuesto || 'IVA_21',
      descuento: parseFloat(data.descuento) || 0
    };

    if (!row.nombre) throw new Error('El nombre del producto es obligatorio');

    var { data: product, error } = await supabase
      .from('productos')
      .insert([row])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Ya existe un producto con esa referencia');
      throw new Error(error.message || 'Error al crear el producto');
    }
    return { success: true, data: product };
  } catch (err) {
    console.error('Error in createProduct:', err);
    return { success: false, error: err.message };
  }
}

async function getProducts() {
  try {
    var supabase = getSupabaseForProducts();
    var { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || 'Error al obtener productos');
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error in getProducts:', err);
    return { success: false, error: err.message, data: [] };
  }
}

async function getProductById(id) {
  try {
    if (!id) throw new Error('ID no proporcionado');
    var supabase = getSupabaseForProducts();
    var { data, error } = await supabase.from('productos').select('*').eq('id', id).single();
    if (error) throw new Error('Producto no encontrado');
    return { success: true, data: data };
  } catch (err) {
    console.error('Error in getProductById:', err);
    return { success: false, error: err.message };
  }
}

async function updateProduct(id, data) {
  try {
    if (!id) throw new Error('ID no proporcionado');
    var supabase = getSupabaseForProducts();

    var row = {};
    if (data.nombre !== undefined) row.nombre = (data.nombre || '').trim();
    if (data.referencia !== undefined) row.referencia = (data.referencia || '').trim() || null;
    if (data.descripcion !== undefined) row.descripcion = (data.descripcion || '').trim() || null;
    if (data.precio_compra !== undefined) row.precio_compra = parseFloat(data.precio_compra) || 0;
    if (data.precio_venta !== undefined) row.precio_venta = parseFloat(data.precio_venta) || 0;
    if (data.impuesto !== undefined) row.impuesto = data.impuesto || 'IVA_21';
    if (data.descuento !== undefined) row.descuento = parseFloat(data.descuento) || 0;

    if (row.nombre !== undefined && !row.nombre) throw new Error('El nombre del producto es obligatorio');

    var { data: product, error } = await supabase
      .from('productos')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Ya existe un producto con esa referencia');
      throw new Error(error.message || 'Error al actualizar el producto');
    }
    return { success: true, data: product };
  } catch (err) {
    console.error('Error in updateProduct:', err);
    return { success: false, error: err.message };
  }
}

async function deleteProduct(id) {
  try {
    if (!id) throw new Error('ID no proporcionado');
    var supabase = getSupabaseForProducts();
    var { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error al eliminar el producto');
    return { success: true };
  } catch (err) {
    console.error('Error in deleteProduct:', err);
    return { success: false, error: err.message };
  }
}

async function searchProducts(query) {
  try {
    var supabase = getSupabaseForProducts();
    var q = supabase.from('productos').select('*').order('nombre', { ascending: true });

    if (query && query.trim()) {
      var term = '%' + query.trim() + '%';
      q = q.or('nombre.ilike.' + term + ',referencia.ilike.' + term);
    }

    var { data, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error in searchProducts:', err);
    return { success: false, error: err.message, data: [] };
  }
}

window.productosDB = {
  createProduct: createProduct,
  getProducts: getProducts,
  getProductById: getProductById,
  updateProduct: updateProduct,
  deleteProduct: deleteProduct,
  searchProducts: searchProducts,
  getTaxRate: getTaxRate,
  calcPVP: calcPVP,
  calcMargen: calcMargen,
  TAX_RATES: TAX_RATES
};
