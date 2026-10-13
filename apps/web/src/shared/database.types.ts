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
          Descripción: string | null;
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
          Descripción?: string | null;
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
          Descripción?: string | null;
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
          cantidad: number | null;
          chat_id: number | null;
          created_at: string;
          error: string | null;
          fuente: string | null;
          id: number;
          sql_generado: string | null;
          texto: string | null;
        };
        ComputedFields: never;
        Insert: {
          cantidad?: number | null;
          chat_id?: number | null;
          created_at?: string;
          error?: string | null;
          fuente?: string | null;
          id?: never;
          sql_generado?: string | null;
          texto?: string | null;
        };
        Update: {
          cantidad?: number | null;
          chat_id?: number | null;
          created_at?: string;
          error?: string | null;
          fuente?: string | null;
          id?: never;
          sql_generado?: string | null;
          texto?: string | null;
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
      fotos_sin_match: {
        Row: {
          archivo: string | null;
          candidatos: string | null;
          created_at: string;
          drive_id: string | null;
          id: number;
          link: string | null;
          resuelto: boolean;
        };
        ComputedFields: never;
        Insert: {
          archivo?: string | null;
          candidatos?: string | null;
          created_at?: string;
          drive_id?: string | null;
          id?: never;
          link?: string | null;
          resuelto?: boolean;
        };
        Update: {
          archivo?: string | null;
          candidatos?: string | null;
          created_at?: string;
          drive_id?: string | null;
          id?: never;
          link?: string | null;
          resuelto?: boolean;
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
          cantidad: number | null;
          chat_id: number | null;
          created_at: string | null;
          error: string | null;
          fuente: string | null;
          id: number | null;
          sql_generado: string | null;
          texto: string | null;
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
      asignar_foto: {
        Args: { p_articulo_id: number; p_foto_id: number };
        Returns: {
          codigo: string | null;
          descripcion: string | null;
          familia_codigo: string | null;
          familia_nombre: string | null;
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
      contar_articulos: {
        Args: { p_con_foto?: boolean; p_familia?: string; p_q?: string };
        Returns: number;
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
      normalizar_busqueda: { Args: { texto: string }; Returns: string };
      ranking_sin_resultados: {
        Args: { p_dias?: number; p_limit?: number };
        Returns: {
          texto: string;
          ultima: string;
          veces: number;
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
      sugerir_codigos: {
        Args: { p_limit?: number; p_textos: string[] };
        Returns: {
          codigo: string;
          id: number;
          nombre: string;
          similitud: number;
          tiene_foto: boolean;
        }[];
      };
      tiene_perfil: { Args: Record<PropertyKey, never>; Returns: boolean };
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
