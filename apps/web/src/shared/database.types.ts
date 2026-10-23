export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      articulos: {
        Row: {
          actualizado_en: string | null;
          Codigo: string | null;
          'codigo  familia': string | null;
          creado_en_web: string | null;
          creado_por: string | null;
          Descripción: string | null;
          foto: string | null;
          id: number;
          Imagen: string | null;
          'Nombre artículo': string | null;
          'Nombre familia': string | null;
          observaciones: string | null;
        };
        ComputedFields: never;
        Insert: {
          actualizado_en?: string | null;
          Codigo?: string | null;
          'codigo  familia'?: string | null;
          creado_en_web?: string | null;
          creado_por?: string | null;
          Descripción?: string | null;
          foto?: string | null;
          id?: never;
          Imagen?: string | null;
          'Nombre artículo'?: string | null;
          'Nombre familia'?: string | null;
          observaciones?: string | null;
        };
        Update: {
          actualizado_en?: string | null;
          Codigo?: string | null;
          'codigo  familia'?: string | null;
          creado_en_web?: string | null;
          creado_por?: string | null;
          Descripción?: string | null;
          foto?: string | null;
          id?: never;
          Imagen?: string | null;
          'Nombre artículo'?: string | null;
          'Nombre familia'?: string | null;
          observaciones?: string | null;
        };
        Relationships: [];
      };
      consultas_bot: {
        Row: {
          aproximada: boolean | null;
          canal: string;
          cantidad: number | null;
          chat_id: number | null;
          created_at: string;
          error: string | null;
          escuchado: string | null;
          familia: string | null;
          fuente: string | null;
          id: number;
          solo_con_foto: boolean | null;
          sql_generado: string | null;
          texto: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          aproximada?: boolean | null;
          canal?: string;
          cantidad?: number | null;
          chat_id?: number | null;
          created_at?: string;
          error?: string | null;
          escuchado?: string | null;
          familia?: string | null;
          fuente?: string | null;
          id?: never;
          solo_con_foto?: boolean | null;
          sql_generado?: string | null;
          texto?: string | null;
          user_id?: string | null;
        };
        Update: {
          aproximada?: boolean | null;
          canal?: string;
          cantidad?: number | null;
          chat_id?: number | null;
          created_at?: string;
          error?: string | null;
          escuchado?: string | null;
          familia?: string | null;
          fuente?: string | null;
          id?: never;
          solo_con_foto?: boolean | null;
          sql_generado?: string | null;
          texto?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      familias: {
        Row: {
          Código: string | null;
          es_producto: boolean;
          Nombre: string | null;
        };
        ComputedFields: never;
        Insert: {
          Código?: string | null;
          es_producto?: boolean;
          Nombre?: string | null;
        };
        Update: {
          Código?: string | null;
          es_producto?: boolean;
          Nombre?: string | null;
        };
        Relationships: [];
      };
      fotos_subidas: {
        Row: {
          articulo_id: number;
          codigo: string | null;
          created_at: string;
          drive_id: string | null;
          foto: string | null;
          foto_anterior: string | null;
          id: number;
          imagen_anterior: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          articulo_id: number;
          codigo?: string | null;
          created_at?: string;
          drive_id?: string | null;
          foto?: string | null;
          foto_anterior?: string | null;
          id?: never;
          imagen_anterior?: string | null;
          user_id?: string | null;
        };
        Update: {
          articulo_id?: number;
          codigo?: string | null;
          created_at?: string;
          drive_id?: string | null;
          foto?: string | null;
          foto_anterior?: string | null;
          id?: never;
          imagen_anterior?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      perfiles: {
        Row: {
          created_at: string;
          nombre: string | null;
          rol: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          nombre?: string | null;
          rol?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          nombre?: string | null;
          rol?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      usuarios_telegram: {
        Row: {
          activo: boolean;
          chat_id: number;
          created_at: string;
          nombre: string;
          notas: string | null;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          chat_id: number;
          created_at?: string;
          nombre: string;
          notas?: string | null;
        };
        Update: {
          activo?: boolean;
          chat_id?: number;
          created_at?: string;
          nombre?: string;
          notas?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      v_articulos: {
        Row: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
          foto: string | null;
          id: number | null;
          imagen_drive_id: string | null;
          imagen_url: string | null;
          nombre: string | null;
          observaciones: string | null;
          tiene_foto: boolean | null;
        };
        ComputedFields: never;
        Insert: {
          codigo?: never;
          descripcion?: string | null;
          familia_codigo?: string | null;
          familia_nombre?: string | null;
          foto?: string | null;
          id?: number | null;
          imagen_drive_id?: never;
          imagen_url?: string | null;
          nombre?: string | null;
          observaciones?: string | null;
          tiene_foto?: never;
        };
        Update: {
          codigo?: never;
          descripcion?: string | null;
          familia_codigo?: string | null;
          familia_nombre?: string | null;
          foto?: string | null;
          id?: number | null;
          imagen_drive_id?: never;
          imagen_url?: string | null;
          nombre?: string | null;
          observaciones?: string | null;
          tiene_foto?: never;
        };
        Relationships: [];
      };
      v_articulos_sin_foto: {
        Row: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
          foto: string | null;
          id: number | null;
          imagen_drive_id: string | null;
          imagen_url: string | null;
          nombre: string | null;
          observaciones: string | null;
          tiene_foto: boolean | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      v_consultas_bot: {
        Row: {
          aproximada: boolean | null;
          canal: string | null;
          cantidad: number | null;
          chat_id: number | null;
          created_at: string | null;
          error: string | null;
          escuchado: string | null;
          familia: string | null;
          fuente: string | null;
          id: number | null;
          solo_con_foto: boolean | null;
          sql_generado: string | null;
          texto: string | null;
          user_id: string | null;
          usuario_nombre: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      v_familias: {
        Row: {
          codigo: string | null;
          es_producto: boolean | null;
          nombre: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      articulo_texto_busqueda: {
        Args: { codigo: string; descripcion: string; nombre: string; observaciones: string };
        Returns: string;
      };
      articulo_texto_compacto: {
        Args: { codigo: string; descripcion: string; nombre: string; observaciones: string };
        Returns: string;
      };
      asignar_foto_subida: {
        Args: { p_articulo_id: number; p_ruta: string };
        Returns: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
          foto: string | null;
          id: number | null;
          imagen_drive_id: string | null;
          imagen_url: string | null;
          nombre: string | null;
          observaciones: string | null;
          tiene_foto: boolean | null;
        };
        SetofOptions: {
          from: '*';
          to: 'v_articulos';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      buscar_articulos: {
        Args: {
          p_con_foto?: boolean;
          p_familia?: string;
          p_limit?: number;
          p_offset?: number;
          p_q?: string;
        };
        Returns: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
          foto: string | null;
          id: number | null;
          imagen_drive_id: string | null;
          imagen_url: string | null;
          nombre: string | null;
          observaciones: string | null;
          tiene_foto: boolean | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'v_articulos';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      compactar_busqueda: { Args: { texto: string }; Returns: string };
      contar_articulos: {
        Args: { p_con_foto?: boolean; p_familia?: string; p_q?: string };
        Returns: number;
      };
      crear_articulo: {
        Args: {
          p_codigo: string;
          p_descripcion?: string;
          p_familia: string;
          p_nombre: string;
          p_observaciones?: string;
        };
        Returns: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
          foto: string | null;
          id: number | null;
          imagen_drive_id: string | null;
          imagen_url: string | null;
          nombre: string | null;
          observaciones: string | null;
          tiene_foto: boolean | null;
        };
        SetofOptions: {
          from: '*';
          to: 'v_articulos';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      escapar_like: { Args: { texto: string }; Returns: string };
      f_unaccent: { Args: { texto: string }; Returns: string };
      filtrar_articulos: {
        Args: { p_con_foto?: boolean; p_familia?: string; p_q?: string };
        Returns: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
          foto: string | null;
          id: number | null;
          imagen_drive_id: string | null;
          imagen_url: string | null;
          nombre: string | null;
          observaciones: string | null;
          tiene_foto: boolean | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'v_articulos';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      kpis_bot: {
        Args: Record<PropertyKey, never>;
        Returns: {
          consultas_hoy: number;
          consultas_semana: number;
          porcentaje_sin_resultados: number;
          usuarios_activos: number;
        }[];
      };
      mi_perfil: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          nombre: string | null;
          rol: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'perfiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      nombre_usuario_web: { Args: { p_user_id: string }; Returns: string };
      normalizar_busqueda: { Args: { texto: string }; Returns: string };
      puede_buscar: { Args: Record<PropertyKey, never>; Returns: boolean };
      puntuar_parecidos: {
        Args: { p_con_foto?: boolean; p_familia?: string; p_q?: string };
        Returns: {
          coincidencias: number;
          id: number;
          parecido: number;
        }[];
      };
      ranking_sin_resultados: {
        Args: { p_dias?: number; p_limit?: number };
        Returns: {
          texto: string;
          ultima: string;
          veces: number;
        }[];
      };
      registrar_consulta: {
        Args: {
          p_aproximada?: boolean;
          p_cantidad?: number;
          p_con_foto?: boolean;
          p_error?: string;
          p_escuchado?: string;
          p_familia?: string;
          p_fuente?: string;
          p_q: string;
        };
        Returns: undefined;
      };
      resumen_busqueda: {
        Args: { p_con_foto?: boolean; p_familia?: string; p_q?: string };
        Returns: {
          aproximada: boolean;
          total: number;
        }[];
      };
      sincronizar_familias: { Args: Record<PropertyKey, never>; Returns: number };
      stats_fotos: {
        Args: Record<PropertyKey, never>;
        Returns: {
          con_foto: number;
          es_total: boolean;
          familia_codigo: string;
          familia_nombre: string;
          porcentaje: number;
          total: number;
        }[];
      };
      termino_compacto: { Args: { p_termino: string }; Returns: string };
      terminos_busqueda: { Args: { p_q: string }; Returns: string[] };
      tiene_perfil: { Args: Record<PropertyKey, never>; Returns: boolean };
      uso_fotos: {
        Args: Record<PropertyKey, never>;
        Returns: {
          bytes: number;
          fotos: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
