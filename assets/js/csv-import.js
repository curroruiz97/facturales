/**
 * CSV/XLSX Import Module
 * Parseo, normalización de headers y validación de filas para importación masiva de contactos.
 * Dependencias: Papa Parse (window.Papa), SheetJS (window.XLSX)
 */

(function () {
  // Diccionario de alias para mapear encabezados del archivo a campos de la tabla clientes
  var HEADER_ALIASES = {
    nombre_razon_social: ['nombre', 'razon_social', 'razon social', 'razón social', 'cliente', 'company', 'nombre_razon_social', 'empresa', 'razón_social'],
    identificador: ['nif', 'cif', 'vat', 'tax_id', 'identificador', 'nif/cif', 'nif_cif', 'dni', 'id_fiscal'],
    email: ['email', 'correo', 'e-mail', 'mail', 'correo_electronico', 'correo electrónico'],
    telefono: ['telefono', 'teléfono', 'phone', 'móvil', 'movil', 'tel', 'celular', 'telephone'],
    direccion: ['direccion', 'dirección', 'address', 'domicilio', 'calle'],
    codigo_postal: ['cp', 'codigo_postal', 'código postal', 'codigo postal', 'zip', 'postal', 'código_postal'],
    ciudad: ['ciudad', 'city', 'localidad', 'población', 'poblacion', 'municipio'],
    pais: ['pais', 'país', 'country'],
    dia_facturacion: ['dia_facturacion', 'día facturación', 'dia facturacion', 'billing_day', 'día_facturación', 'dia'],
    estado: ['estado', 'status', 'tipo', 'type']
  };

  // Variantes de estado normalizadas
  var ESTADO_RECURRENTE = ['recurrente', 'recurrent', 'activo', 'active', 'si', 'sí', 'yes'];
  var ESTADO_PUNTUAL = ['puntual', 'one-off', 'inactivo', 'inactive', 'no', 'oneoff'];

  /**
   * Normaliza un string para comparación: lowercase, trim, elimina acentos
   */
  function normalizeStr(s) {
    if (!s) return '';
    return String(s).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Mapea los encabezados del archivo a los campos de la tabla clientes.
   * @param {string[]} headers - Encabezados originales del archivo
   * @returns {{ map: Object, unmapped: string[], missing: string[] }}
   */
  function normalizeHeaders(headers) {
    var map = {};
    var mapped = {};
    var unmapped = [];

    headers.forEach(function (rawHeader) {
      var norm = normalizeStr(rawHeader);
      var found = false;

      for (var field in HEADER_ALIASES) {
        if (mapped[field]) continue;
        var aliases = HEADER_ALIASES[field];
        for (var i = 0; i < aliases.length; i++) {
          if (normalizeStr(aliases[i]) === norm) {
            map[rawHeader] = field;
            mapped[field] = true;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        unmapped.push(rawHeader);
      }
    });

    var missing = [];
    var required = ['nombre_razon_social', 'identificador'];
    required.forEach(function (f) {
      if (!mapped[f]) missing.push(f);
    });

    return { map: map, unmapped: unmapped, missing: missing };
  }

  /**
   * Transforma una fila cruda (objeto con keys originales) a un objeto con keys normalizados.
   */
  function mapRowFields(rawRow, headerMap) {
    var row = {};
    for (var originalKey in headerMap) {
      var field = headerMap[originalKey];
      var val = rawRow[originalKey];
      row[field] = (val !== undefined && val !== null) ? String(val).trim() : '';
    }
    return row;
  }

  /**
   * Normaliza el valor de estado a 'recurrente' o 'puntual'.
   */
  function normalizeEstado(val) {
    if (!val || !val.trim()) return 'recurrente';
    var norm = normalizeStr(val);
    if (ESTADO_RECURRENTE.indexOf(norm) !== -1) return 'recurrente';
    if (ESTADO_PUNTUAL.indexOf(norm) !== -1) return 'puntual';
    return 'recurrente';
  }

  /**
   * Valida y normaliza una fila mapeada.
   * @param {Object} row - Fila con campos normalizados
   * @param {number} rowIndex - Índice original de la fila (1-based)
   * @returns {{ valid: boolean, data: Object, errors: string[] }}
   */
  function validateAndNormalizeRow(row, rowIndex) {
    var errors = [];
    var data = {};

    // Requeridos
    data.nombre_razon_social = (row.nombre_razon_social || '').trim();
    if (!data.nombre_razon_social) {
      errors.push('Falta nombre/razón social');
    }

    data.identificador = (row.identificador || '').trim().toUpperCase();
    if (!data.identificador) {
      errors.push('Falta identificador (NIF/CIF)');
    }

    // Opcionales con validación
    data.email = (row.email || '').trim() || null;
    if (data.email && window.isValidEmail && !window.isValidEmail(data.email)) {
      errors.push('Email inválido: ' + data.email);
    }

    data.telefono = (row.telefono || '').trim() || null;
    data.direccion = (row.direccion || '').trim() || null;
    data.codigo_postal = (row.codigo_postal || '').trim() || null;
    data.ciudad = (row.ciudad || '').trim() || null;
    data.pais = (row.pais || '').trim() || null;

    // Día de facturación
    var rawDay = (row.dia_facturacion || '').trim();
    if (rawDay) {
      var day = parseInt(rawDay, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        errors.push('Día de facturación inválido: ' + rawDay);
        data.dia_facturacion = null;
      } else {
        data.dia_facturacion = day;
      }
    } else {
      data.dia_facturacion = null;
    }

    // Estado
    data.estado = normalizeEstado(row.estado);

    return {
      valid: errors.length === 0,
      data: data,
      errors: errors,
      rowIndex: rowIndex
    };
  }

  /**
   * Parsea un archivo CSV o XLSX y devuelve headers + filas.
   * @param {File} file
   * @returns {Promise<{ headers: string[], rows: Object[] }>}
   */
  function parseFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      return parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return parseXLSX(file);
    } else {
      return Promise.reject(new Error('Formato no soportado. Usa CSV o XLSX.'));
    }
  }

  function parseCSV(file) {
    return new Promise(function (resolve, reject) {
      if (!window.Papa) {
        return reject(new Error('Papa Parse no está cargado'));
      }

      window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: function (results) {
          if (results.errors && results.errors.length > 0) {
            var criticalErrors = results.errors.filter(function (e) {
              return e.type !== 'FieldMismatch';
            });
            if (criticalErrors.length > 0) {
              return reject(new Error('Error al parsear CSV: ' + criticalErrors[0].message));
            }
          }
          resolve({
            headers: results.meta.fields || [],
            rows: results.data || []
          });
        },
        error: function (err) {
          reject(new Error('Error al leer CSV: ' + err.message));
        }
      });
    });
  }

  function parseXLSX(file) {
    return new Promise(function (resolve, reject) {
      if (!window.XLSX) {
        return reject(new Error('SheetJS no está cargado'));
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = window.XLSX.read(e.target.result, { type: 'array' });
          var sheetName = workbook.SheetNames[0];
          var sheet = workbook.Sheets[sheetName];
          var jsonData = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });

          if (!jsonData || jsonData.length === 0) {
            return reject(new Error('La hoja de cálculo está vacía'));
          }

          var headers = Object.keys(jsonData[0]);
          resolve({ headers: headers, rows: jsonData });
        } catch (err) {
          reject(new Error('Error al leer XLSX: ' + err.message));
        }
      };
      reader.onerror = function () {
        reject(new Error('Error al leer el archivo'));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Procesa un archivo completo: parsea, mapea headers y valida cada fila.
   * @param {File} file
   * @returns {Promise<{ headerMap: Object, validRows: Object[], invalidRows: Object[], unmappedHeaders: string[], missingHeaders: string[], totalRows: number }>}
   */
  async function processFile(file) {
    var parsed = await parseFile(file);
    var headerResult = normalizeHeaders(parsed.headers);

    if (headerResult.missing.length > 0) {
      throw new Error(
        'Faltan columnas obligatorias: ' + headerResult.missing.join(', ') +
        '. Columnas detectadas: ' + parsed.headers.join(', ')
      );
    }

    var validRows = [];
    var invalidRows = [];

    parsed.rows.forEach(function (rawRow, idx) {
      var mappedRow = mapRowFields(rawRow, headerResult.map);
      var result = validateAndNormalizeRow(mappedRow, idx + 2); // +2: fila 1 es headers, idx 0-based

      if (result.valid) {
        validRows.push(result);
      } else {
        invalidRows.push(result);
      }
    });

    return {
      headerMap: headerResult.map,
      unmappedHeaders: headerResult.unmapped,
      missingHeaders: headerResult.missing,
      validRows: validRows,
      invalidRows: invalidRows,
      totalRows: parsed.rows.length
    };
  }

  // Exportar API pública
  window.csvImport = {
    parseFile: parseFile,
    processFile: processFile,
    normalizeHeaders: normalizeHeaders,
    validateAndNormalizeRow: validateAndNormalizeRow
  };
})();
