export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      _migrations_applied: {
        Row: {
          applied_at: string;
          filename: string;
        };
        Insert: {
          applied_at?: string;
          filename: string;
        };
        Update: {
          applied_at?: string;
          filename?: string;
        };
        Relationships: [];
      };
      almox_itens: {
        Row: {
          ativo: boolean;
          categoria: string | null;
          codigo: string;
          codigo_fabricante: string | null;
          codigo_fabricante_norm: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string;
          descricao_norm: string | null;
          estoque_minimo: number;
          fabricante: string | null;
          fornecedor_preferencial_id: string | null;
          id: string;
          observacoes: string | null;
          part_number: string | null;
          part_number_norm: string | null;
          unidade_estoque: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo?: boolean;
          categoria?: string | null;
          codigo: string;
          codigo_fabricante?: string | null;
          codigo_fabricante_norm?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao: string;
          descricao_norm?: string | null;
          estoque_minimo?: number;
          fabricante?: string | null;
          fornecedor_preferencial_id?: string | null;
          id?: string;
          observacoes?: string | null;
          part_number?: string | null;
          part_number_norm?: string | null;
          unidade_estoque: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo?: boolean;
          categoria?: string | null;
          codigo?: string;
          codigo_fabricante?: string | null;
          codigo_fabricante_norm?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string;
          descricao_norm?: string | null;
          estoque_minimo?: number;
          fabricante?: string | null;
          fornecedor_preferencial_id?: string | null;
          id?: string;
          observacoes?: string | null;
          part_number?: string | null;
          part_number_norm?: string | null;
          unidade_estoque?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "almox_itens_fornecedor_preferencial_id_fkey";
            columns: ["fornecedor_preferencial_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_itens_unidade_estoque_fkey";
            columns: ["unidade_estoque"];
            isOneToOne: false;
            referencedRelation: "almox_unidades";
            referencedColumns: ["codigo"];
          },
        ];
      };
      almox_itens_conversao: {
        Row: {
          created_at: string;
          created_by: string | null;
          fator: number;
          item_id: string;
          unidade_compra: string;
          unidade_compra_norm: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          fator: number;
          item_id: string;
          unidade_compra: string;
          unidade_compra_norm: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          fator?: number;
          item_id?: string;
          unidade_compra?: string;
          unidade_compra_norm?: string;
        };
        Relationships: [
          {
            foreignKeyName: "almox_itens_conversao_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_itens_conversao_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_saldo_item";
            referencedColumns: ["item_id"];
          },
        ];
      };
      almox_locais: {
        Row: {
          ativo: boolean;
          codigo: string;
          created_at: string;
          descricao: string | null;
          id: string;
          padrao: boolean;
          posicao: string | null;
          prateleira: string | null;
          rua: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          codigo: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          padrao?: boolean;
          posicao?: string | null;
          prateleira?: string | null;
          rua?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          codigo?: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          padrao?: boolean;
          posicao?: string | null;
          prateleira?: string | null;
          rua?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      almox_movimentos: {
        Row: {
          created_at: string;
          created_by: string | null;
          custo_medio_apos: number;
          custo_unitario: number;
          fator_conversao: number;
          id: string;
          item_id: string;
          justificativa: string | null;
          local_id: string;
          movimento_origem_id: string | null;
          observacao: string | null;
          ordem_compra_item_id: string | null;
          permite_negativo: boolean;
          projeto_id: string | null;
          quantidade: number;
          recebimento_id: string | null;
          reserva_id: string | null;
          seq: number;
          tipo: string;
          unidade_origem: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          custo_medio_apos?: number;
          custo_unitario?: number;
          fator_conversao?: number;
          id?: string;
          item_id: string;
          justificativa?: string | null;
          local_id: string;
          movimento_origem_id?: string | null;
          observacao?: string | null;
          ordem_compra_item_id?: string | null;
          permite_negativo?: boolean;
          projeto_id?: string | null;
          quantidade: number;
          recebimento_id?: string | null;
          reserva_id?: string | null;
          seq?: number;
          tipo: string;
          unidade_origem?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          custo_medio_apos?: number;
          custo_unitario?: number;
          fator_conversao?: number;
          id?: string;
          item_id?: string;
          justificativa?: string | null;
          local_id?: string;
          movimento_origem_id?: string | null;
          observacao?: string | null;
          ordem_compra_item_id?: string | null;
          permite_negativo?: boolean;
          projeto_id?: string | null;
          quantidade?: number;
          recebimento_id?: string | null;
          reserva_id?: string | null;
          seq?: number;
          tipo?: string;
          unidade_origem?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "almox_movimentos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_saldo_item";
            referencedColumns: ["item_id"];
          },
          {
            foreignKeyName: "almox_movimentos_local_id_fkey";
            columns: ["local_id"];
            isOneToOne: false;
            referencedRelation: "almox_locais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_movimento_origem_id_fkey";
            columns: ["movimento_origem_id"];
            isOneToOne: false;
            referencedRelation: "almox_movimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_ordem_compra_item_id_fkey";
            columns: ["ordem_compra_item_id"];
            isOneToOne: false;
            referencedRelation: "almox_recebimento_oc_item";
            referencedColumns: ["ordem_compra_item_id"];
          },
          {
            foreignKeyName: "almox_movimentos_ordem_compra_item_id_fkey";
            columns: ["ordem_compra_item_id"];
            isOneToOne: false;
            referencedRelation: "ordem_compra_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_recebimento_id_fkey";
            columns: ["recebimento_id"];
            isOneToOne: false;
            referencedRelation: "almox_recebimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_reserva_id_fkey";
            columns: ["reserva_id"];
            isOneToOne: false;
            referencedRelation: "almox_reservas";
            referencedColumns: ["id"];
          },
        ];
      };
      almox_recebimentos: {
        Row: {
          created_at: string;
          evento_key: string;
          id: string;
          nota_fiscal: string | null;
          observacao: string | null;
          ordem_compra_id: string;
          recebido_em: string;
          recebido_por: string | null;
        };
        Insert: {
          created_at?: string;
          evento_key: string;
          id?: string;
          nota_fiscal?: string | null;
          observacao?: string | null;
          ordem_compra_id: string;
          recebido_em?: string;
          recebido_por?: string | null;
        };
        Update: {
          created_at?: string;
          evento_key?: string;
          id?: string;
          nota_fiscal?: string | null;
          observacao?: string | null;
          ordem_compra_id?: string;
          recebido_em?: string;
          recebido_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "almox_recebimentos_ordem_compra_id_fkey";
            columns: ["ordem_compra_id"];
            isOneToOne: false;
            referencedRelation: "ordens_compra";
            referencedColumns: ["id"];
          },
        ];
      };
      almox_reservas: {
        Row: {
          created_at: string;
          created_by: string | null;
          expira_em: string;
          id: string;
          item_id: string;
          observacao: string | null;
          projeto_id: string;
          quantidade: number;
          quantidade_retirada: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expira_em?: string;
          id?: string;
          item_id: string;
          observacao?: string | null;
          projeto_id: string;
          quantidade: number;
          quantidade_retirada?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expira_em?: string;
          id?: string;
          item_id?: string;
          observacao?: string | null;
          projeto_id?: string;
          quantidade?: number;
          quantidade_retirada?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "almox_reservas_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_reservas_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_saldo_item";
            referencedColumns: ["item_id"];
          },
          {
            foreignKeyName: "almox_reservas_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
        ];
      };
      almox_unidades: {
        Row: {
          ativo: boolean;
          casas_decimais: number;
          codigo: string;
          created_at: string;
          descricao: string;
        };
        Insert: {
          ativo?: boolean;
          casas_decimais?: number;
          codigo: string;
          created_at?: string;
          descricao: string;
        };
        Update: {
          ativo?: boolean;
          casas_decimais?: number;
          codigo?: string;
          created_at?: string;
          descricao?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"];
          created_at: string;
          field_changed: string | null;
          id: string;
          new_value: Json | null;
          old_value: Json | null;
          record_id: string;
          table_name: string;
          user_id: string | null;
        };
        Insert: {
          action: Database["public"]["Enums"]["audit_action"];
          created_at?: string;
          field_changed?: string | null;
          id?: string;
          new_value?: Json | null;
          old_value?: Json | null;
          record_id: string;
          table_name: string;
          user_id?: string | null;
        };
        Update: {
          action?: Database["public"]["Enums"]["audit_action"];
          created_at?: string;
          field_changed?: string | null;
          id?: string;
          new_value?: Json | null;
          old_value?: Json | null;
          record_id?: string;
          table_name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      brand_settings: {
        Row: {
          allow_indexing: boolean;
          canonical_base_url: string | null;
          contact_address: string | null;
          contact_email: string | null;
          contact_hours: string | null;
          contact_phone: string | null;
          contact_whatsapp: string | null;
          default_theme: string;
          favicon_url: string | null;
          footer_text: string | null;
          id: string;
          logo_url: string | null;
          logo_url_collapsed: string | null;
          logo_url_collapsed_dark: string | null;
          logo_url_dark: string | null;
          meta_description: string | null;
          meta_title: string | null;
          primary_color: string;
          singleton: boolean;
          social_instagram: string | null;
          social_linkedin: string | null;
          social_youtube: string | null;
          support_email: string | null;
          system_name: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          allow_indexing?: boolean;
          canonical_base_url?: string | null;
          contact_address?: string | null;
          contact_email?: string | null;
          contact_hours?: string | null;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          default_theme?: string;
          favicon_url?: string | null;
          footer_text?: string | null;
          id?: string;
          logo_url?: string | null;
          logo_url_collapsed?: string | null;
          logo_url_collapsed_dark?: string | null;
          logo_url_dark?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          primary_color?: string;
          singleton?: boolean;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_youtube?: string | null;
          support_email?: string | null;
          system_name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          allow_indexing?: boolean;
          canonical_base_url?: string | null;
          contact_address?: string | null;
          contact_email?: string | null;
          contact_hours?: string | null;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          default_theme?: string;
          favicon_url?: string | null;
          footer_text?: string | null;
          id?: string;
          logo_url?: string | null;
          logo_url_collapsed?: string | null;
          logo_url_collapsed_dark?: string | null;
          logo_url_dark?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          primary_color?: string;
          singleton?: boolean;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_youtube?: string | null;
          support_email?: string | null;
          system_name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      chamado_eventos: {
        Row: {
          at: string;
          autor_id: string | null;
          autor_nome: string | null;
          chamado_id: string;
          from_status: Database["public"]["Enums"]["chamado_status"] | null;
          id: string;
          meta: Json | null;
          tipo: Database["public"]["Enums"]["chamado_evento_tipo"];
          to_status: Database["public"]["Enums"]["chamado_status"] | null;
        };
        Insert: {
          at?: string;
          autor_id?: string | null;
          autor_nome?: string | null;
          chamado_id: string;
          from_status?: Database["public"]["Enums"]["chamado_status"] | null;
          id?: string;
          meta?: Json | null;
          tipo: Database["public"]["Enums"]["chamado_evento_tipo"];
          to_status?: Database["public"]["Enums"]["chamado_status"] | null;
        };
        Update: {
          at?: string;
          autor_id?: string | null;
          autor_nome?: string | null;
          chamado_id?: string;
          from_status?: Database["public"]["Enums"]["chamado_status"] | null;
          id?: string;
          meta?: Json | null;
          tipo?: Database["public"]["Enums"]["chamado_evento_tipo"];
          to_status?: Database["public"]["Enums"]["chamado_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "chamado_eventos_chamado_id_fkey";
            columns: ["chamado_id"];
            isOneToOne: false;
            referencedRelation: "chamados";
            referencedColumns: ["id"];
          },
        ];
      };
      chamado_mensagens: {
        Row: {
          autor_id: string | null;
          autor_nome: string;
          autor_tipo: Database["public"]["Enums"]["chamado_autor_tipo"];
          chamado_id: string;
          conteudo: string;
          created_at: string;
          id: string;
          interno: boolean;
        };
        Insert: {
          autor_id?: string | null;
          autor_nome: string;
          autor_tipo: Database["public"]["Enums"]["chamado_autor_tipo"];
          chamado_id: string;
          conteudo: string;
          created_at?: string;
          id?: string;
          interno?: boolean;
        };
        Update: {
          autor_id?: string | null;
          autor_nome?: string;
          autor_tipo?: Database["public"]["Enums"]["chamado_autor_tipo"];
          chamado_id?: string;
          conteudo?: string;
          created_at?: string;
          id?: string;
          interno?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "chamado_mensagens_chamado_id_fkey";
            columns: ["chamado_id"];
            isOneToOne: false;
            referencedRelation: "chamados";
            referencedColumns: ["id"];
          },
        ];
      };
      chamado_sla_config: {
        Row: {
          estagnado_horas: number;
          origem: Database["public"]["Enums"]["chamado_origem"];
          prioridade: Database["public"]["Enums"]["chamado_prioridade"];
          resolucao_horas: number;
          resposta_horas: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          estagnado_horas: number;
          origem: Database["public"]["Enums"]["chamado_origem"];
          prioridade: Database["public"]["Enums"]["chamado_prioridade"];
          resolucao_horas: number;
          resposta_horas: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          estagnado_horas?: number;
          origem?: Database["public"]["Enums"]["chamado_origem"];
          prioridade?: Database["public"]["Enums"]["chamado_prioridade"];
          resolucao_horas?: number;
          resposta_horas?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      chamados: {
        Row: {
          assunto: string | null;
          atendente_id: string | null;
          atendente_nome: string | null;
          cliente_id: string | null;
          codigo: string;
          created_at: string;
          descricao_inicial: string;
          equipamento_id: string | null;
          estagnado_alertado_em: string | null;
          first_response_at: string | null;
          id: string;
          ip_criacao: unknown;
          numero_serie: string | null;
          origem: Database["public"]["Enums"]["chamado_origem"];
          prioridade: Database["public"]["Enums"]["chamado_prioridade"];
          reaberto_em: string | null;
          resolvido_em: string | null;
          sla_alertado_em: string | null;
          sla_resolucao_at: string | null;
          sla_resposta_at: string | null;
          status: Database["public"]["Enums"]["chamado_status"];
          token_hash: string;
          ultima_mensagem_em: string | null;
          ultima_mensagem_por: Database["public"]["Enums"]["chamado_autor_tipo"] | null;
          updated_at: string;
          user_agent: string | null;
          visitante_email: string;
          visitante_nome: string;
          visitante_telefone: string | null;
        };
        Insert: {
          assunto?: string | null;
          atendente_id?: string | null;
          atendente_nome?: string | null;
          cliente_id?: string | null;
          codigo: string;
          created_at?: string;
          descricao_inicial: string;
          equipamento_id?: string | null;
          estagnado_alertado_em?: string | null;
          first_response_at?: string | null;
          id?: string;
          ip_criacao?: unknown;
          numero_serie?: string | null;
          origem?: Database["public"]["Enums"]["chamado_origem"];
          prioridade?: Database["public"]["Enums"]["chamado_prioridade"];
          reaberto_em?: string | null;
          resolvido_em?: string | null;
          sla_alertado_em?: string | null;
          sla_resolucao_at?: string | null;
          sla_resposta_at?: string | null;
          status?: Database["public"]["Enums"]["chamado_status"];
          token_hash: string;
          ultima_mensagem_em?: string | null;
          ultima_mensagem_por?: Database["public"]["Enums"]["chamado_autor_tipo"] | null;
          updated_at?: string;
          user_agent?: string | null;
          visitante_email: string;
          visitante_nome: string;
          visitante_telefone?: string | null;
        };
        Update: {
          assunto?: string | null;
          atendente_id?: string | null;
          atendente_nome?: string | null;
          cliente_id?: string | null;
          codigo?: string;
          created_at?: string;
          descricao_inicial?: string;
          equipamento_id?: string | null;
          estagnado_alertado_em?: string | null;
          first_response_at?: string | null;
          id?: string;
          ip_criacao?: unknown;
          numero_serie?: string | null;
          origem?: Database["public"]["Enums"]["chamado_origem"];
          prioridade?: Database["public"]["Enums"]["chamado_prioridade"];
          reaberto_em?: string | null;
          resolvido_em?: string | null;
          sla_alertado_em?: string | null;
          sla_resolucao_at?: string | null;
          sla_resposta_at?: string | null;
          status?: Database["public"]["Enums"]["chamado_status"];
          token_hash?: string;
          ultima_mensagem_em?: string | null;
          ultima_mensagem_por?: Database["public"]["Enums"]["chamado_autor_tipo"] | null;
          updated_at?: string;
          user_agent?: string | null;
          visitante_email?: string;
          visitante_nome?: string;
          visitante_telefone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chamados_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chamados_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_contatos: {
        Row: {
          cargo: string | null;
          cliente_id: string;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          id: string;
          nome: string;
          principal: boolean;
          telefone_ddi: string | null;
          telefone_numero: string | null;
          updated_at: string;
        };
        Insert: {
          cargo?: string | null;
          cliente_id: string;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          nome: string;
          principal?: boolean;
          telefone_ddi?: string | null;
          telefone_numero?: string | null;
          updated_at?: string;
        };
        Update: {
          cargo?: string | null;
          cliente_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          nome?: string;
          principal?: boolean;
          telefone_ddi?: string | null;
          telefone_numero?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_documentos: {
        Row: {
          categoria: string;
          cliente_id: string;
          created_at: string;
          deleted_at: string | null;
          drive_file_id: string;
          drive_view_url: string | null;
          id: string;
          mime: string | null;
          nome_final: string;
          nome_original: string | null;
          size_bytes: number | null;
          updated_at: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          categoria?: string;
          cliente_id: string;
          created_at?: string;
          deleted_at?: string | null;
          drive_file_id: string;
          drive_view_url?: string | null;
          id?: string;
          mime?: string | null;
          nome_final: string;
          nome_original?: string | null;
          size_bytes?: number | null;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          categoria?: string;
          cliente_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          drive_file_id?: string;
          drive_view_url?: string | null;
          id?: string;
          mime?: string | null;
          nome_final?: string;
          nome_original?: string | null;
          size_bytes?: number | null;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_documentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_equipamento_documentos: {
        Row: {
          categoria: Database["public"]["Enums"]["equipamento_doc_categoria"];
          cliente_id: string;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          drive_file_id: string | null;
          drive_folder_id: string | null;
          drive_view_url: string | null;
          equipamento_id: string;
          id: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          observacoes: string | null;
          processo_id: string | null;
          tamanho_bytes: number;
          updated_at: string;
          user_id: string | null;
          user_nome: string | null;
          versao: string | null;
        };
        Insert: {
          categoria?: Database["public"]["Enums"]["equipamento_doc_categoria"];
          cliente_id: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          equipamento_id: string;
          id?: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          observacoes?: string | null;
          processo_id?: string | null;
          tamanho_bytes: number;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
          versao?: string | null;
        };
        Update: {
          categoria?: Database["public"]["Enums"]["equipamento_doc_categoria"];
          cliente_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          equipamento_id?: string;
          id?: string;
          mime_type?: string;
          nome_final?: string;
          nome_original?: string;
          observacoes?: string | null;
          processo_id?: string | null;
          tamanho_bytes?: number;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
          versao?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_equipamento_documentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_equipamento_documentos_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_equipamento_documentos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_equipamentos: {
        Row: {
          categoria: Database["public"]["Enums"]["equipamento_categoria"];
          cliente_id: string;
          clonado_de_equipamento_id: string | null;
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          data_entrega: string | null;
          data_garantia_fim: string | null;
          data_instalacao: string | null;
          deleted_at: string | null;
          fabricante: string | null;
          id: string;
          localizacao: string | null;
          modelo: string;
          numero_serie: string | null;
          observacoes: string | null;
          oportunidade_id: string | null;
          planejamento_template_slug: string | null;
          processo_id: string | null;
          responsavel_automacao_id: string | null;
          responsavel_engenharia_id: string | null;
          resumo: string | null;
          status: Database["public"]["Enums"]["equipamento_status"];
          tag_cliente: string | null;
          updated_at: string;
          updated_by: string | null;
          valor_venda: number | null;
        };
        Insert: {
          categoria?: Database["public"]["Enums"]["equipamento_categoria"];
          cliente_id: string;
          clonado_de_equipamento_id?: string | null;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_entrega?: string | null;
          data_garantia_fim?: string | null;
          data_instalacao?: string | null;
          deleted_at?: string | null;
          fabricante?: string | null;
          id?: string;
          localizacao?: string | null;
          modelo: string;
          numero_serie?: string | null;
          observacoes?: string | null;
          oportunidade_id?: string | null;
          planejamento_template_slug?: string | null;
          processo_id?: string | null;
          responsavel_automacao_id?: string | null;
          responsavel_engenharia_id?: string | null;
          resumo?: string | null;
          status?: Database["public"]["Enums"]["equipamento_status"];
          tag_cliente?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          valor_venda?: number | null;
        };
        Update: {
          categoria?: Database["public"]["Enums"]["equipamento_categoria"];
          cliente_id?: string;
          clonado_de_equipamento_id?: string | null;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_entrega?: string | null;
          data_garantia_fim?: string | null;
          data_instalacao?: string | null;
          deleted_at?: string | null;
          fabricante?: string | null;
          id?: string;
          localizacao?: string | null;
          modelo?: string;
          numero_serie?: string | null;
          observacoes?: string | null;
          oportunidade_id?: string | null;
          planejamento_template_slug?: string | null;
          processo_id?: string | null;
          responsavel_automacao_id?: string | null;
          responsavel_engenharia_id?: string | null;
          resumo?: string | null;
          status?: Database["public"]["Enums"]["equipamento_status"];
          tag_cliente?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          valor_venda?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_equipamentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_equipamentos_clonado_de_equipamento_id_fkey";
            columns: ["clonado_de_equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_equipamentos_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_equipamentos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_interacoes: {
        Row: {
          cliente_id: string;
          created_at: string;
          deleted_at: string | null;
          descricao: string;
          id: string;
          payload: Json | null;
          tipo: string;
          updated_at: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          deleted_at?: string | null;
          descricao: string;
          id?: string;
          payload?: Json | null;
          tipo: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          descricao?: string;
          id?: string;
          payload?: Json | null;
          tipo?: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_interacoes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_sales_liberacao: {
        Row: {
          cliente_id: string;
          id: string;
          liberado_em: string;
          liberado_por: string | null;
          observacoes: string | null;
          revogado_em: string | null;
          revogado_por: string | null;
          sales_id: string;
        };
        Insert: {
          cliente_id: string;
          id?: string;
          liberado_em?: string;
          liberado_por?: string | null;
          observacoes?: string | null;
          revogado_em?: string | null;
          revogado_por?: string | null;
          sales_id: string;
        };
        Update: {
          cliente_id?: string;
          id?: string;
          liberado_em?: string;
          liberado_por?: string | null;
          observacoes?: string | null;
          revogado_em?: string | null;
          revogado_por?: string | null;
          sales_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_sales_liberacao_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente_socios: {
        Row: {
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          desde: string | null;
          id: string;
          nome: string;
          qualificacao: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          desde?: string | null;
          id?: string;
          nome: string;
          qualificacao?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          desde?: string | null;
          id?: string;
          nome?: string;
          qualificacao?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_socios_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      clientes: {
        Row: {
          apelido: string | null;
          capital_social: number | null;
          cnae_principal: string | null;
          cnaes_secundarios: string[] | null;
          codigo: string;
          created_at: string;
          created_by: string | null;
          data_abertura: string | null;
          data_situacao: string | null;
          deleted_at: string | null;
          documento_fiscal_numero: string;
          documento_fiscal_tipo: string;
          email_corporativo: string | null;
          endereco_bairro: string | null;
          endereco_cidade: string | null;
          endereco_codigo_postal: string | null;
          endereco_complemento: string | null;
          endereco_estado: string | null;
          endereco_logradouro: string | null;
          endereco_numero: string | null;
          geocoded_at: string | null;
          id: string;
          idioma: string;
          inscricao_estadual: string | null;
          key_account: boolean;
          latitude: number | null;
          lead_origem_id: string | null;
          lifecycle_stage: Database["public"]["Enums"]["cliente_lifecycle"];
          longitude: number | null;
          matriz_filial: string | null;
          moeda: string;
          motivo_situacao: string | null;
          natureza_juridica_codigo: string | null;
          natureza_juridica_descricao: string | null;
          nome_fantasia: string | null;
          observacoes: string | null;
          oportunidades_abertas: number;
          pais: string;
          porte: string | null;
          processos_ativos: number;
          processos_total: number;
          ramal: string | null;
          razao_social: string;
          regime_tributario: string | null;
          segmento: string | null;
          segmento_id: string | null;
          site: string | null;
          situacao_cadastral: string | null;
          social_facebook: string | null;
          social_instagram: string | null;
          social_linkedin: string | null;
          social_skype: string | null;
          social_twitter: string | null;
          social_whatsapp: string | null;
          status: string;
          telefone_corporativo_ddi: string | null;
          telefone_corporativo_numero: string | null;
          tornou_cliente_em: string | null;
          ultimo_contato_em: string | null;
          updated_at: string;
          updated_by: string | null;
          valor_ganho_total: number;
        };
        Insert: {
          apelido?: string | null;
          capital_social?: number | null;
          cnae_principal?: string | null;
          cnaes_secundarios?: string[] | null;
          codigo: string;
          created_at?: string;
          created_by?: string | null;
          data_abertura?: string | null;
          data_situacao?: string | null;
          deleted_at?: string | null;
          documento_fiscal_numero: string;
          documento_fiscal_tipo: string;
          email_corporativo?: string | null;
          endereco_bairro?: string | null;
          endereco_cidade?: string | null;
          endereco_codigo_postal?: string | null;
          endereco_complemento?: string | null;
          endereco_estado?: string | null;
          endereco_logradouro?: string | null;
          endereco_numero?: string | null;
          geocoded_at?: string | null;
          id?: string;
          idioma?: string;
          inscricao_estadual?: string | null;
          key_account?: boolean;
          latitude?: number | null;
          lead_origem_id?: string | null;
          lifecycle_stage?: Database["public"]["Enums"]["cliente_lifecycle"];
          longitude?: number | null;
          matriz_filial?: string | null;
          moeda?: string;
          motivo_situacao?: string | null;
          natureza_juridica_codigo?: string | null;
          natureza_juridica_descricao?: string | null;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          oportunidades_abertas?: number;
          pais: string;
          porte?: string | null;
          processos_ativos?: number;
          processos_total?: number;
          ramal?: string | null;
          razao_social: string;
          regime_tributario?: string | null;
          segmento?: string | null;
          segmento_id?: string | null;
          site?: string | null;
          situacao_cadastral?: string | null;
          social_facebook?: string | null;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_skype?: string | null;
          social_twitter?: string | null;
          social_whatsapp?: string | null;
          status?: string;
          telefone_corporativo_ddi?: string | null;
          telefone_corporativo_numero?: string | null;
          tornou_cliente_em?: string | null;
          ultimo_contato_em?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          valor_ganho_total?: number;
        };
        Update: {
          apelido?: string | null;
          capital_social?: number | null;
          cnae_principal?: string | null;
          cnaes_secundarios?: string[] | null;
          codigo?: string;
          created_at?: string;
          created_by?: string | null;
          data_abertura?: string | null;
          data_situacao?: string | null;
          deleted_at?: string | null;
          documento_fiscal_numero?: string;
          documento_fiscal_tipo?: string;
          email_corporativo?: string | null;
          endereco_bairro?: string | null;
          endereco_cidade?: string | null;
          endereco_codigo_postal?: string | null;
          endereco_complemento?: string | null;
          endereco_estado?: string | null;
          endereco_logradouro?: string | null;
          endereco_numero?: string | null;
          geocoded_at?: string | null;
          id?: string;
          idioma?: string;
          inscricao_estadual?: string | null;
          key_account?: boolean;
          latitude?: number | null;
          lead_origem_id?: string | null;
          lifecycle_stage?: Database["public"]["Enums"]["cliente_lifecycle"];
          longitude?: number | null;
          matriz_filial?: string | null;
          moeda?: string;
          motivo_situacao?: string | null;
          natureza_juridica_codigo?: string | null;
          natureza_juridica_descricao?: string | null;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          oportunidades_abertas?: number;
          pais?: string;
          porte?: string | null;
          processos_ativos?: number;
          processos_total?: number;
          ramal?: string | null;
          razao_social?: string;
          regime_tributario?: string | null;
          segmento?: string | null;
          segmento_id?: string | null;
          site?: string | null;
          situacao_cadastral?: string | null;
          social_facebook?: string | null;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_skype?: string | null;
          social_twitter?: string | null;
          social_whatsapp?: string | null;
          status?: string;
          telefone_corporativo_ddi?: string | null;
          telefone_corporativo_numero?: string | null;
          tornou_cliente_em?: string | null;
          ultimo_contato_em?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          valor_ganho_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_lead_origem_id_fkey";
            columns: ["lead_origem_id"];
            isOneToOne: false;
            referencedRelation: "lead_origens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clientes_pais_fkey";
            columns: ["pais"];
            isOneToOne: false;
            referencedRelation: "paises_config";
            referencedColumns: ["codigo"];
          },
          {
            foreignKeyName: "clientes_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
        ];
      };
      compras_condicoes_pagamento: {
        Row: {
          ativo: boolean;
          codigo: string;
          criado_em: string;
          descricao_en: string | null;
          descricao_es: string | null;
          descricao_pt: string;
          dias_liquidos: number | null;
          id: string;
          ordem: number;
        };
        Insert: {
          ativo?: boolean;
          codigo: string;
          criado_em?: string;
          descricao_en?: string | null;
          descricao_es?: string | null;
          descricao_pt: string;
          dias_liquidos?: number | null;
          id?: string;
          ordem?: number;
        };
        Update: {
          ativo?: boolean;
          codigo?: string;
          criado_em?: string;
          descricao_en?: string | null;
          descricao_es?: string | null;
          descricao_pt?: string;
          dias_liquidos?: number | null;
          id?: string;
          ordem?: number;
        };
        Relationships: [];
      };
      compras_transportadoras: {
        Row: {
          ativo: boolean;
          cnpj: string | null;
          contato: string | null;
          criado_em: string;
          criado_por: string | null;
          email: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          telefone: string | null;
        };
        Insert: {
          ativo?: boolean;
          cnpj?: string | null;
          contato?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          email?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          telefone?: string | null;
        };
        Update: {
          ativo?: boolean;
          cnpj?: string | null;
          contato?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          email?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          telefone?: string | null;
        };
        Relationships: [];
      };
      contato_mensagens: {
        Row: {
          assunto: string | null;
          atendente_id: string | null;
          atendente_nome: string | null;
          chamado_id: string | null;
          created_at: string;
          email: string;
          id: string;
          ip: string | null;
          last_reply_at: string | null;
          mensagem: string;
          nome: string;
          origem: string;
          read_at: string | null;
          read_by: string | null;
          status: string;
          telefone: string | null;
          updated_at: string;
          user_agent: string | null;
        };
        Insert: {
          assunto?: string | null;
          atendente_id?: string | null;
          atendente_nome?: string | null;
          chamado_id?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          ip?: string | null;
          last_reply_at?: string | null;
          mensagem: string;
          nome: string;
          origem?: string;
          read_at?: string | null;
          read_by?: string | null;
          status?: string;
          telefone?: string | null;
          updated_at?: string;
          user_agent?: string | null;
        };
        Update: {
          assunto?: string | null;
          atendente_id?: string | null;
          atendente_nome?: string | null;
          chamado_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          ip?: string | null;
          last_reply_at?: string | null;
          mensagem?: string;
          nome?: string;
          origem?: string;
          read_at?: string | null;
          read_by?: string | null;
          status?: string;
          telefone?: string | null;
          updated_at?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contato_mensagens_chamado_id_fkey";
            columns: ["chamado_id"];
            isOneToOne: false;
            referencedRelation: "chamados";
            referencedColumns: ["id"];
          },
        ];
      };
      contato_respostas: {
        Row: {
          autor_email: string | null;
          autor_id: string | null;
          autor_nome: string;
          canal: string;
          conteudo: string;
          created_at: string;
          id: string;
          mensagem_id: string;
        };
        Insert: {
          autor_email?: string | null;
          autor_id?: string | null;
          autor_nome: string;
          canal?: string;
          conteudo: string;
          created_at?: string;
          id?: string;
          mensagem_id: string;
        };
        Update: {
          autor_email?: string | null;
          autor_id?: string | null;
          autor_nome?: string;
          canal?: string;
          conteudo?: string;
          created_at?: string;
          id?: string;
          mensagem_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contato_respostas_mensagem_id_fkey";
            columns: ["mensagem_id"];
            isOneToOne: false;
            referencedRelation: "contato_mensagens";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_escolhas: {
        Row: {
          cotacao_item_id: string;
          escolhido_em: string;
          escolhido_por: string | null;
          id: string;
          justificativa: string | null;
          proposta_item_id: string;
        };
        Insert: {
          cotacao_item_id: string;
          escolhido_em?: string;
          escolhido_por?: string | null;
          id?: string;
          justificativa?: string | null;
          proposta_item_id: string;
        };
        Update: {
          cotacao_item_id?: string;
          escolhido_em?: string;
          escolhido_por?: string | null;
          id?: string;
          justificativa?: string | null;
          proposta_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_escolhas_cotacao_item_id_fkey";
            columns: ["cotacao_item_id"];
            isOneToOne: true;
            referencedRelation: "cotacao_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacao_escolhas_proposta_item_id_fkey";
            columns: ["proposta_item_id"];
            isOneToOne: false;
            referencedRelation: "cotacao_proposta_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_fornecedores: {
        Row: {
          cotacao_id: string;
          created_at: string;
          email_enviado_para: string | null;
          enviado_em: string | null;
          fornecedor_id: string;
          id: string;
          respondido_em: string | null;
          status: Database["public"]["Enums"]["cotacao_convite_status"];
          token: string;
          visualizado_em: string | null;
        };
        Insert: {
          cotacao_id: string;
          created_at?: string;
          email_enviado_para?: string | null;
          enviado_em?: string | null;
          fornecedor_id: string;
          id?: string;
          respondido_em?: string | null;
          status?: Database["public"]["Enums"]["cotacao_convite_status"];
          token?: string;
          visualizado_em?: string | null;
        };
        Update: {
          cotacao_id?: string;
          created_at?: string;
          email_enviado_para?: string | null;
          enviado_em?: string | null;
          fornecedor_id?: string;
          id?: string;
          respondido_em?: string | null;
          status?: Database["public"]["Enums"]["cotacao_convite_status"];
          token?: string;
          visualizado_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_fornecedores_cotacao_id_fkey";
            columns: ["cotacao_id"];
            isOneToOne: false;
            referencedRelation: "cotacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacao_fornecedores_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_historico: {
        Row: {
          ator: string | null;
          cotacao_id: string;
          created_at: string;
          detalhes: Json | null;
          evento: string;
          id: string;
        };
        Insert: {
          ator?: string | null;
          cotacao_id: string;
          created_at?: string;
          detalhes?: Json | null;
          evento: string;
          id?: string;
        };
        Update: {
          ator?: string | null;
          cotacao_id?: string;
          created_at?: string;
          detalhes?: Json | null;
          evento?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_historico_cotacao_id_fkey";
            columns: ["cotacao_id"];
            isOneToOne: false;
            referencedRelation: "cotacoes";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_itens: {
        Row: {
          cotacao_id: string;
          created_at: string;
          descricao_snapshot: string;
          id: string;
          insumo_id: string;
          observacoes: string | null;
          part_number_snapshot: string | null;
          quantidade: number;
          spec_snapshot: string | null;
          unidade: string;
        };
        Insert: {
          cotacao_id: string;
          created_at?: string;
          descricao_snapshot: string;
          id?: string;
          insumo_id: string;
          observacoes?: string | null;
          part_number_snapshot?: string | null;
          quantidade: number;
          spec_snapshot?: string | null;
          unidade?: string;
        };
        Update: {
          cotacao_id?: string;
          created_at?: string;
          descricao_snapshot?: string;
          id?: string;
          insumo_id?: string;
          observacoes?: string | null;
          part_number_snapshot?: string | null;
          quantidade?: number;
          spec_snapshot?: string | null;
          unidade?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_itens_cotacao_id_fkey";
            columns: ["cotacao_id"];
            isOneToOne: false;
            referencedRelation: "cotacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacao_itens_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_proposta_anexos: {
        Row: {
          drive_file_id: string | null;
          drive_view_url: string | null;
          file_name: string;
          id: string;
          mime: string | null;
          origem: string;
          proposta_id: string;
          tamanho_bytes: number | null;
          uploaded_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          drive_file_id?: string | null;
          drive_view_url?: string | null;
          file_name: string;
          id?: string;
          mime?: string | null;
          origem?: string;
          proposta_id: string;
          tamanho_bytes?: number | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          drive_file_id?: string | null;
          drive_view_url?: string | null;
          file_name?: string;
          id?: string;
          mime?: string | null;
          origem?: string;
          proposta_id?: string;
          tamanho_bytes?: number | null;
          uploaded_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_proposta_anexos_proposta_id_fkey";
            columns: ["proposta_id"];
            isOneToOne: false;
            referencedRelation: "cotacao_propostas";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_proposta_itens: {
        Row: {
          cotacao_item_id: string;
          desconto_pct: number;
          icms_st_pct: number;
          id: string;
          ipi_pct: number;
          marca_oferecida: string | null;
          observacoes: string | null;
          part_number_oferecido: string | null;
          prazo_entrega_dias: number | null;
          preco_unit: number;
          proposta_id: string;
          quantidade_snapshot: number;
          valor_total: number | null;
        };
        Insert: {
          cotacao_item_id: string;
          desconto_pct?: number;
          icms_st_pct?: number;
          id?: string;
          ipi_pct?: number;
          marca_oferecida?: string | null;
          observacoes?: string | null;
          part_number_oferecido?: string | null;
          prazo_entrega_dias?: number | null;
          preco_unit?: number;
          proposta_id: string;
          quantidade_snapshot?: number;
          valor_total?: number | null;
        };
        Update: {
          cotacao_item_id?: string;
          desconto_pct?: number;
          icms_st_pct?: number;
          id?: string;
          ipi_pct?: number;
          marca_oferecida?: string | null;
          observacoes?: string | null;
          part_number_oferecido?: string | null;
          prazo_entrega_dias?: number | null;
          preco_unit?: number;
          proposta_id?: string;
          quantidade_snapshot?: number;
          valor_total?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_proposta_itens_cotacao_item_id_fkey";
            columns: ["cotacao_item_id"];
            isOneToOne: false;
            referencedRelation: "cotacao_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cotacao_proposta_itens_proposta_id_fkey";
            columns: ["proposta_id"];
            isOneToOne: false;
            referencedRelation: "cotacao_propostas";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacao_propostas: {
        Row: {
          analisado_em: string | null;
          analise_status: string | null;
          anexo_url: string | null;
          condicao_pagamento_detectada: string | null;
          convite_id: string;
          frete: number | null;
          id: string;
          lead_time_detectado: number | null;
          lead_time_dias: number | null;
          moeda_detectada: string | null;
          observacoes_fornecedor: string | null;
          resumo_ai: string | null;
          submetido_em: string;
          submetido_ip: string | null;
          validade: string | null;
          valor_detectado: number | null;
        };
        Insert: {
          analisado_em?: string | null;
          analise_status?: string | null;
          anexo_url?: string | null;
          condicao_pagamento_detectada?: string | null;
          convite_id: string;
          frete?: number | null;
          id?: string;
          lead_time_detectado?: number | null;
          lead_time_dias?: number | null;
          moeda_detectada?: string | null;
          observacoes_fornecedor?: string | null;
          resumo_ai?: string | null;
          submetido_em?: string;
          submetido_ip?: string | null;
          validade?: string | null;
          valor_detectado?: number | null;
        };
        Update: {
          analisado_em?: string | null;
          analise_status?: string | null;
          anexo_url?: string | null;
          condicao_pagamento_detectada?: string | null;
          convite_id?: string;
          frete?: number | null;
          id?: string;
          lead_time_detectado?: number | null;
          lead_time_dias?: number | null;
          moeda_detectada?: string | null;
          observacoes_fornecedor?: string | null;
          resumo_ai?: string | null;
          submetido_em?: string;
          submetido_ip?: string | null;
          validade?: string | null;
          valor_detectado?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "cotacao_propostas_convite_id_fkey";
            columns: ["convite_id"];
            isOneToOne: true;
            referencedRelation: "cotacao_fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      cotacoes: {
        Row: {
          codigo: string;
          condicoes_pagamento: string | null;
          created_at: string;
          criado_por: string | null;
          deleted_at: string | null;
          descricao: string | null;
          id: string;
          incoterm: string | null;
          moeda: string;
          observacoes: string | null;
          origem: string | null;
          prazo_resposta: string | null;
          projeto_id: string | null;
          responsavel_compras: string | null;
          status: Database["public"]["Enums"]["cotacao_status"];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          codigo?: string;
          condicoes_pagamento?: string | null;
          created_at?: string;
          criado_por?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          id?: string;
          incoterm?: string | null;
          moeda?: string;
          observacoes?: string | null;
          origem?: string | null;
          prazo_resposta?: string | null;
          projeto_id?: string | null;
          responsavel_compras?: string | null;
          status?: Database["public"]["Enums"]["cotacao_status"];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          codigo?: string;
          condicoes_pagamento?: string | null;
          created_at?: string;
          criado_por?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          id?: string;
          incoterm?: string | null;
          moeda?: string;
          observacoes?: string | null;
          origem?: string | null;
          prazo_resposta?: string | null;
          projeto_id?: string | null;
          responsavel_compras?: string | null;
          status?: Database["public"]["Enums"]["cotacao_status"];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cotacoes_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
        ];
      };
      documento_aprovacoes: {
        Row: {
          acao: Database["public"]["Enums"]["documento_aprovacao_acao"];
          actor_nome: string | null;
          actor_user_id: string | null;
          comentario: string | null;
          created_at: string;
          documento_id: string;
          id: string;
          status_anterior: Database["public"]["Enums"]["documento_status"] | null;
          status_novo: Database["public"]["Enums"]["documento_status"];
          versao: string | null;
        };
        Insert: {
          acao: Database["public"]["Enums"]["documento_aprovacao_acao"];
          actor_nome?: string | null;
          actor_user_id?: string | null;
          comentario?: string | null;
          created_at?: string;
          documento_id: string;
          id?: string;
          status_anterior?: Database["public"]["Enums"]["documento_status"] | null;
          status_novo: Database["public"]["Enums"]["documento_status"];
          versao?: string | null;
        };
        Update: {
          acao?: Database["public"]["Enums"]["documento_aprovacao_acao"];
          actor_nome?: string | null;
          actor_user_id?: string | null;
          comentario?: string | null;
          created_at?: string;
          documento_id?: string;
          id?: string;
          status_anterior?: Database["public"]["Enums"]["documento_status"] | null;
          status_novo?: Database["public"]["Enums"]["documento_status"];
          versao?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documento_aprovacoes_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "documentos";
            referencedColumns: ["id"];
          },
        ];
      };
      documento_assinaturas: {
        Row: {
          algoritmo: string;
          documento_id: string;
          hmac: string;
          id: string;
          idioma: string;
          payload: Json;
          sha256: string;
          signed_at: string;
          signed_by: string | null;
          signed_by_nome: string | null;
          storage_path: string;
          versao: string;
        };
        Insert: {
          algoritmo?: string;
          documento_id: string;
          hmac: string;
          id?: string;
          idioma: string;
          payload?: Json;
          sha256: string;
          signed_at?: string;
          signed_by?: string | null;
          signed_by_nome?: string | null;
          storage_path: string;
          versao: string;
        };
        Update: {
          algoritmo?: string;
          documento_id?: string;
          hmac?: string;
          id?: string;
          idioma?: string;
          payload?: Json;
          sha256?: string;
          signed_at?: string;
          signed_by?: string | null;
          signed_by_nome?: string | null;
          storage_path?: string;
          versao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documento_assinaturas_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "documentos";
            referencedColumns: ["id"];
          },
        ];
      };
      documento_bloco_versoes: {
        Row: {
          acao: string;
          alterado_por: string | null;
          alterado_por_nome: string | null;
          bloco_id: string;
          comentario: string | null;
          conteudo_en: Json;
          conteudo_es: Json;
          conteudo_pt: Json;
          created_at: string;
          id: string;
          obrigatorio: boolean;
          ordem_padrao: number;
          restaurado_de: string | null;
          tipo_codigo: string;
          versao_seq: number;
        };
        Insert: {
          acao?: string;
          alterado_por?: string | null;
          alterado_por_nome?: string | null;
          bloco_id: string;
          comentario?: string | null;
          conteudo_en?: Json;
          conteudo_es?: Json;
          conteudo_pt?: Json;
          created_at?: string;
          id?: string;
          obrigatorio?: boolean;
          ordem_padrao?: number;
          restaurado_de?: string | null;
          tipo_codigo: string;
          versao_seq: number;
        };
        Update: {
          acao?: string;
          alterado_por?: string | null;
          alterado_por_nome?: string | null;
          bloco_id?: string;
          comentario?: string | null;
          conteudo_en?: Json;
          conteudo_es?: Json;
          conteudo_pt?: Json;
          created_at?: string;
          id?: string;
          obrigatorio?: boolean;
          ordem_padrao?: number;
          restaurado_de?: string | null;
          tipo_codigo?: string;
          versao_seq?: number;
        };
        Relationships: [
          {
            foreignKeyName: "documento_bloco_versoes_bloco_id_fkey";
            columns: ["bloco_id"];
            isOneToOne: false;
            referencedRelation: "documento_blocos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_bloco_versoes_restaurado_de_fkey";
            columns: ["restaurado_de"];
            isOneToOne: false;
            referencedRelation: "documento_bloco_versoes";
            referencedColumns: ["id"];
          },
        ];
      };
      documento_blocos: {
        Row: {
          ativo: boolean;
          codigo: string;
          conteudo_en: Json;
          conteudo_es: Json;
          conteudo_pt: Json;
          created_at: string;
          descricao: string | null;
          id: string;
          largura: number;
          nome: string;
          obrigatorio: boolean;
          ordem_padrao: number;
          tipo_codigo: string;
          updated_at: string;
          variaveis_obrigatorias: string[];
        };
        Insert: {
          ativo?: boolean;
          codigo: string;
          conteudo_en?: Json;
          conteudo_es?: Json;
          conteudo_pt?: Json;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          largura?: number;
          nome: string;
          obrigatorio?: boolean;
          ordem_padrao?: number;
          tipo_codigo: string;
          updated_at?: string;
          variaveis_obrigatorias?: string[];
        };
        Update: {
          ativo?: boolean;
          codigo?: string;
          conteudo_en?: Json;
          conteudo_es?: Json;
          conteudo_pt?: Json;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          largura?: number;
          nome?: string;
          obrigatorio?: boolean;
          ordem_padrao?: number;
          tipo_codigo?: string;
          updated_at?: string;
          variaveis_obrigatorias?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "documento_blocos_tipo_codigo_fkey";
            columns: ["tipo_codigo"];
            isOneToOne: false;
            referencedRelation: "documento_tipos";
            referencedColumns: ["codigo"];
          },
        ];
      };
      documento_layout_config: {
        Row: {
          accent_color: string;
          config_extra: Json;
          empresa_contato: string | null;
          empresa_endereco: string | null;
          empresa_nome: string;
          logo_url: string | null;
          rodape_extra: string | null;
          tipo_codigo: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          config_extra?: Json;
          empresa_contato?: string | null;
          empresa_endereco?: string | null;
          empresa_nome?: string;
          logo_url?: string | null;
          rodape_extra?: string | null;
          tipo_codigo: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          config_extra?: Json;
          empresa_contato?: string | null;
          empresa_endereco?: string | null;
          empresa_nome?: string;
          logo_url?: string | null;
          rodape_extra?: string | null;
          tipo_codigo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documento_layout_config_tipo_codigo_fkey";
            columns: ["tipo_codigo"];
            isOneToOne: true;
            referencedRelation: "documento_tipos";
            referencedColumns: ["codigo"];
          },
        ];
      };
      documento_tipos: {
        Row: {
          ativo: boolean;
          codigo: string;
          created_at: string;
          descricao: string | null;
          id: string;
          nome: string;
          prefixo_codigo: string;
        };
        Insert: {
          ativo?: boolean;
          codigo: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome: string;
          prefixo_codigo?: string;
        };
        Update: {
          ativo?: boolean;
          codigo?: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome?: string;
          prefixo_codigo?: string;
        };
        Relationships: [];
      };
      documento_versoes: {
        Row: {
          arquivos: Json;
          documento_id: string;
          gerado_em: string;
          gerado_por: string | null;
          id: string;
          payload: Json;
          versao: string;
        };
        Insert: {
          arquivos?: Json;
          documento_id: string;
          gerado_em?: string;
          gerado_por?: string | null;
          id?: string;
          payload?: Json;
          versao: string;
        };
        Update: {
          arquivos?: Json;
          documento_id?: string;
          gerado_em?: string;
          gerado_por?: string | null;
          id?: string;
          payload?: Json;
          versao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documento_versoes_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "documentos";
            referencedColumns: ["id"];
          },
        ];
      };
      documentos: {
        Row: {
          blocos: Json;
          cliente_id: string;
          codigo: string;
          created_at: string;
          created_by: string | null;
          drive_file_ids: Json | null;
          drive_folder_id: string | null;
          drive_sync_error: string | null;
          drive_synced_at: string | null;
          drive_url: string | null;
          id: string;
          idioma_principal: Database["public"]["Enums"]["documento_idioma"];
          idiomas_gerados: Database["public"]["Enums"]["documento_idioma"][];
          moeda: Database["public"]["Enums"]["documento_moeda"];
          oportunidade_id: string | null;
          payload: Json;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["documento_status"];
          tipo_codigo: string;
          titulo: string | null;
          updated_at: string;
          versao: string;
        };
        Insert: {
          blocos?: Json;
          cliente_id: string;
          codigo: string;
          created_at?: string;
          created_by?: string | null;
          drive_file_ids?: Json | null;
          drive_folder_id?: string | null;
          drive_sync_error?: string | null;
          drive_synced_at?: string | null;
          drive_url?: string | null;
          id?: string;
          idioma_principal?: Database["public"]["Enums"]["documento_idioma"];
          idiomas_gerados?: Database["public"]["Enums"]["documento_idioma"][];
          moeda?: Database["public"]["Enums"]["documento_moeda"];
          oportunidade_id?: string | null;
          payload?: Json;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["documento_status"];
          tipo_codigo: string;
          titulo?: string | null;
          updated_at?: string;
          versao?: string;
        };
        Update: {
          blocos?: Json;
          cliente_id?: string;
          codigo?: string;
          created_at?: string;
          created_by?: string | null;
          drive_file_ids?: Json | null;
          drive_folder_id?: string | null;
          drive_sync_error?: string | null;
          drive_synced_at?: string | null;
          drive_url?: string | null;
          id?: string;
          idioma_principal?: Database["public"]["Enums"]["documento_idioma"];
          idiomas_gerados?: Database["public"]["Enums"]["documento_idioma"][];
          moeda?: Database["public"]["Enums"]["documento_moeda"];
          oportunidade_id?: string | null;
          payload?: Json;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["documento_status"];
          tipo_codigo?: string;
          titulo?: string | null;
          updated_at?: string;
          versao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_tipo_codigo_fkey";
            columns: ["tipo_codigo"];
            isOneToOne: false;
            referencedRelation: "documento_tipos";
            referencedColumns: ["codigo"];
          },
        ];
      };
      email_event_config: {
        Row: {
          body_template: string;
          calendar_duration_min: number | null;
          create_calendar_event: boolean;
          created_at: string;
          description: string | null;
          enabled: boolean;
          event_key: string;
          label: string;
          module: string;
          required_vars: string[];
          subject_template: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          body_template: string;
          calendar_duration_min?: number | null;
          create_calendar_event?: boolean;
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          event_key: string;
          label: string;
          module: string;
          required_vars?: string[];
          subject_template: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          body_template?: string;
          calendar_duration_min?: number | null;
          create_calendar_event?: boolean;
          created_at?: string;
          description?: string | null;
          enabled?: boolean;
          event_key?: string;
          label?: string;
          module?: string;
          required_vars?: string[];
          subject_template?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      email_event_recipients: {
        Row: {
          event_key: string;
          mode: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          event_key: string;
          mode: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          event_key?: string;
          mode?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [
          {
            foreignKeyName: "email_event_recipients_event_key_fkey";
            columns: ["event_key"];
            isOneToOne: false;
            referencedRelation: "email_event_config";
            referencedColumns: ["event_key"];
          },
        ];
      };
      email_send_log: {
        Row: {
          calendar_event_ids: Json | null;
          cc_addresses: string[];
          created_at: string;
          entity_id: string | null;
          entity_table: string | null;
          error: string | null;
          event_key: string;
          gmail_message_id: string | null;
          id: string;
          required_missing: string[] | null;
          status: string;
          subject: string;
          template_snapshot: Json | null;
          to_addresses: string[];
          triggered_by: string | null;
          triggered_by_kind: string;
          vars_used: Json | null;
        };
        Insert: {
          calendar_event_ids?: Json | null;
          cc_addresses?: string[];
          created_at?: string;
          entity_id?: string | null;
          entity_table?: string | null;
          error?: string | null;
          event_key: string;
          gmail_message_id?: string | null;
          id?: string;
          required_missing?: string[] | null;
          status: string;
          subject: string;
          template_snapshot?: Json | null;
          to_addresses?: string[];
          triggered_by?: string | null;
          triggered_by_kind: string;
          vars_used?: Json | null;
        };
        Update: {
          calendar_event_ids?: Json | null;
          cc_addresses?: string[];
          created_at?: string;
          entity_id?: string | null;
          entity_table?: string | null;
          error?: string | null;
          event_key?: string;
          gmail_message_id?: string | null;
          id?: string;
          required_missing?: string[] | null;
          status?: string;
          subject?: string;
          template_snapshot?: Json | null;
          to_addresses?: string[];
          triggered_by?: string | null;
          triggered_by_kind?: string;
          vars_used?: Json | null;
        };
        Relationships: [];
      };
      enrich_cache: {
        Row: {
          documento: string;
          fetched_at: string;
          id: string;
          pais: string;
          payload: Json;
          provider: string;
        };
        Insert: {
          documento: string;
          fetched_at?: string;
          id?: string;
          pais: string;
          payload: Json;
          provider: string;
        };
        Update: {
          documento?: string;
          fetched_at?: string;
          id?: string;
          pais?: string;
          payload?: Json;
          provider?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrich_cache_pais_fkey";
            columns: ["pais"];
            isOneToOne: false;
            referencedRelation: "paises_config";
            referencedColumns: ["codigo"];
          },
        ];
      };
      enrich_log: {
        Row: {
          cached: boolean;
          created_at: string;
          documento: string;
          error: string | null;
          id: string;
          pais: string;
          provider: string | null;
          source: string | null;
          success: boolean;
          user_id: string | null;
        };
        Insert: {
          cached?: boolean;
          created_at?: string;
          documento: string;
          error?: string | null;
          id?: string;
          pais: string;
          provider?: string | null;
          source?: string | null;
          success: boolean;
          user_id?: string | null;
        };
        Update: {
          cached?: boolean;
          created_at?: string;
          documento?: string;
          error?: string | null;
          id?: string;
          pais?: string;
          provider?: string | null;
          source?: string | null;
          success?: boolean;
          user_id?: string | null;
        };
        Relationships: [];
      };
      entrevista_audit: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          entrevista_id: string;
          id: string;
          meta: Json | null;
          reason: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          entrevista_id: string;
          id?: string;
          meta?: Json | null;
          reason?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          entrevista_id?: string;
          id?: string;
          meta?: Json | null;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entrevista_audit_entrevista_id_fkey";
            columns: ["entrevista_id"];
            isOneToOne: false;
            referencedRelation: "entrevistas";
            referencedColumns: ["id"];
          },
        ];
      };
      entrevista_catalog_audit: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          meta: Json | null;
          segmento_id: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          meta?: Json | null;
          segmento_id?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          meta?: Json | null;
          segmento_id?: string | null;
        };
        Relationships: [];
      };
      entrevista_documentos_gerados: {
        Row: {
          criado_em: string;
          drive_file_id: string | null;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          drive_view_url: string | null;
          entrevista_id: string;
          file_name: string | null;
          gerado_por: string | null;
          id: string;
          idioma: string;
          storage_path: string | null;
        };
        Insert: {
          criado_em?: string;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          drive_view_url?: string | null;
          entrevista_id: string;
          file_name?: string | null;
          gerado_por?: string | null;
          id?: string;
          idioma?: string;
          storage_path?: string | null;
        };
        Update: {
          criado_em?: string;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          drive_view_url?: string | null;
          entrevista_id?: string;
          file_name?: string | null;
          gerado_por?: string | null;
          id?: string;
          idioma?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entrevista_documentos_gerados_entrevista_id_fkey";
            columns: ["entrevista_id"];
            isOneToOne: false;
            referencedRelation: "entrevistas";
            referencedColumns: ["id"];
          },
        ];
      };
      entrevista_opcoes: {
        Row: {
          created_at: string;
          id: string;
          label_en: string | null;
          label_es: string | null;
          label_pt: string;
          ordem: number;
          pergunta_id: string;
          tem_descricao: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label_en?: string | null;
          label_es?: string | null;
          label_pt: string;
          ordem?: number;
          pergunta_id: string;
          tem_descricao?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          label_en?: string | null;
          label_es?: string | null;
          label_pt?: string;
          ordem?: number;
          pergunta_id?: string;
          tem_descricao?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "entrevista_opcoes_pergunta_id_fkey";
            columns: ["pergunta_id"];
            isOneToOne: false;
            referencedRelation: "entrevista_perguntas";
            referencedColumns: ["id"];
          },
        ];
      };
      entrevista_perguntas: {
        Row: {
          created_at: string;
          enunciado_en: string | null;
          enunciado_es: string | null;
          enunciado_pt: string;
          formato: string;
          id: string;
          numero: number;
          obrigatoria: boolean;
          ordem: number;
          segmento_id: string;
        };
        Insert: {
          created_at?: string;
          enunciado_en?: string | null;
          enunciado_es?: string | null;
          enunciado_pt: string;
          formato?: string;
          id?: string;
          numero: number;
          obrigatoria?: boolean;
          ordem?: number;
          segmento_id: string;
        };
        Update: {
          created_at?: string;
          enunciado_en?: string | null;
          enunciado_es?: string | null;
          enunciado_pt?: string;
          formato?: string;
          id?: string;
          numero?: number;
          obrigatoria?: boolean;
          ordem?: number;
          segmento_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entrevista_perguntas_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "entrevista_segmentos";
            referencedColumns: ["id"];
          },
        ];
      };
      entrevista_respostas: {
        Row: {
          created_at: string;
          descricao_extra: string | null;
          entrevista_id: string;
          id: string;
          pergunta_id: string;
          valor_options: Json | null;
          valor_text: string | null;
        };
        Insert: {
          created_at?: string;
          descricao_extra?: string | null;
          entrevista_id: string;
          id?: string;
          pergunta_id: string;
          valor_options?: Json | null;
          valor_text?: string | null;
        };
        Update: {
          created_at?: string;
          descricao_extra?: string | null;
          entrevista_id?: string;
          id?: string;
          pergunta_id?: string;
          valor_options?: Json | null;
          valor_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "entrevista_respostas_entrevista_id_fkey";
            columns: ["entrevista_id"];
            isOneToOne: false;
            referencedRelation: "entrevistas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entrevista_respostas_pergunta_id_fkey";
            columns: ["pergunta_id"];
            isOneToOne: false;
            referencedRelation: "entrevista_perguntas";
            referencedColumns: ["id"];
          },
        ];
      };
      entrevista_segmentos: {
        Row: {
          ativo: boolean;
          created_at: string;
          id: string;
          nome_en: string | null;
          nome_es: string | null;
          nome_pt: string;
          ordem: number;
          slug: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          nome_en?: string | null;
          nome_es?: string | null;
          nome_pt: string;
          ordem?: number;
          slug: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          id?: string;
          nome_en?: string | null;
          nome_es?: string | null;
          nome_pt?: string;
          ordem?: number;
          slug?: string;
        };
        Relationships: [];
      };
      entrevistas: {
        Row: {
          codigo: string;
          contato_cargo: string | null;
          contato_email: string | null;
          contato_nome: string | null;
          contato_whatsapp: string | null;
          created_at: string;
          criado_por: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deleted_reason: string | null;
          expires_at: string | null;
          id: string;
          idioma_default: string;
          lead_email: string | null;
          lead_empresa: string | null;
          lead_nome: string | null;
          purge_at: string | null;
          respondida_em: string | null;
          segmento_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          codigo: string;
          contato_cargo?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_whatsapp?: string | null;
          created_at?: string;
          criado_por: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_reason?: string | null;
          expires_at?: string | null;
          id?: string;
          idioma_default?: string;
          lead_email?: string | null;
          lead_empresa?: string | null;
          lead_nome?: string | null;
          purge_at?: string | null;
          respondida_em?: string | null;
          segmento_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          codigo?: string;
          contato_cargo?: string | null;
          contato_email?: string | null;
          contato_nome?: string | null;
          contato_whatsapp?: string | null;
          created_at?: string;
          criado_por?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deleted_reason?: string | null;
          expires_at?: string | null;
          id?: string;
          idioma_default?: string;
          lead_email?: string | null;
          lead_empresa?: string | null;
          lead_nome?: string | null;
          purge_at?: string | null;
          respondida_em?: string | null;
          segmento_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entrevistas_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "entrevista_segmentos";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_disciplina_etapas: {
        Row: {
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          data_vencimento: string | null;
          deleted_at: string | null;
          descricao: string | null;
          disciplina: string;
          equipamento_id: string;
          id: string;
          ordem: number;
          parent_id: string | null;
          prioridade: string;
          progresso: number;
          responsavel_id: string | null;
          responsavel_nome: string | null;
          status: string;
          titulo: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_vencimento?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          disciplina: string;
          equipamento_id: string;
          id?: string;
          ordem?: number;
          parent_id?: string | null;
          prioridade?: string;
          progresso?: number;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          status?: string;
          titulo: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_vencimento?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          disciplina?: string;
          equipamento_id?: string;
          id?: string;
          ordem?: number;
          parent_id?: string | null;
          prioridade?: string;
          progresso?: number;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          status?: string;
          titulo?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_disciplina_etapas_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_disciplina_etapas_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_disciplina_etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_etapa_anexos: {
        Row: {
          cliente_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          descricao: string | null;
          equipamento_id: string;
          etapa_id: string;
          id: string;
          mime: string;
          nome_arquivo: string;
          storage_path: string;
          tamanho_bytes: number;
        };
        Insert: {
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          equipamento_id: string;
          etapa_id: string;
          id?: string;
          mime: string;
          nome_arquivo: string;
          storage_path: string;
          tamanho_bytes: number;
        };
        Update: {
          cliente_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          equipamento_id?: string;
          etapa_id?: string;
          id?: string;
          mime?: string;
          nome_arquivo?: string;
          storage_path?: string;
          tamanho_bytes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_etapa_anexos_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_etapa_anexos_etapa_id_fkey";
            columns: ["etapa_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_disciplina_etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_etapa_comentarios: {
        Row: {
          autor_id: string | null;
          autor_nome: string | null;
          created_at: string;
          etapa_id: string;
          id: string;
          mentions: string[];
          texto: string;
        };
        Insert: {
          autor_id?: string | null;
          autor_nome?: string | null;
          created_at?: string;
          etapa_id: string;
          id?: string;
          mentions?: string[];
          texto: string;
        };
        Update: {
          autor_id?: string | null;
          autor_nome?: string | null;
          created_at?: string;
          etapa_id?: string;
          id?: string;
          mentions?: string[];
          texto?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_etapa_comentarios_etapa_id_fkey";
            columns: ["etapa_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_disciplina_etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_etapas: {
        Row: {
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          data_fim_prev: string | null;
          data_fim_real: string | null;
          data_inicio_prev: string | null;
          data_inicio_real: string | null;
          deleted_at: string | null;
          equipamento_id: string;
          fase: Database["public"]["Enums"]["etapa_fase"];
          hh_eletrica_estimada: number;
          hh_eletrica_real: number;
          hh_mecanica_estimada: number;
          hh_mecanica_real: number;
          id: string;
          nome: string;
          observacoes: string | null;
          ordem: number;
          predecessora_id: string | null;
          progresso: number;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["etapa_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          data_fim_prev?: string | null;
          data_fim_real?: string | null;
          data_inicio_prev?: string | null;
          data_inicio_real?: string | null;
          deleted_at?: string | null;
          equipamento_id: string;
          fase?: Database["public"]["Enums"]["etapa_fase"];
          hh_eletrica_estimada?: number;
          hh_eletrica_real?: number;
          hh_mecanica_estimada?: number;
          hh_mecanica_real?: number;
          id?: string;
          nome: string;
          observacoes?: string | null;
          ordem?: number;
          predecessora_id?: string | null;
          progresso?: number;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["etapa_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          data_fim_prev?: string | null;
          data_fim_real?: string | null;
          data_inicio_prev?: string | null;
          data_inicio_real?: string | null;
          deleted_at?: string | null;
          equipamento_id?: string;
          fase?: Database["public"]["Enums"]["etapa_fase"];
          hh_eletrica_estimada?: number;
          hh_eletrica_real?: number;
          hh_mecanica_estimada?: number;
          hh_mecanica_real?: number;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          ordem?: number;
          predecessora_id?: string | null;
          progresso?: number;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["etapa_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_etapas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_etapas_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_etapas_predecessora_id_fkey";
            columns: ["predecessora_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_etp_anexos: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao: string;
          drive_file_id: string;
          drive_folder_id: string | null;
          drive_view_url: string | null;
          etp_id: string;
          id: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          tamanho_bytes: number;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao: string;
          drive_file_id: string;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          etp_id: string;
          id?: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          tamanho_bytes: number;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string;
          drive_file_id?: string;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          etp_id?: string;
          id?: string;
          mime_type?: string;
          nome_final?: string;
          nome_original?: string;
          tamanho_bytes?: number;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_etp_anexos_etp_id_fkey";
            columns: ["etp_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_etps";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_etp_historico: {
        Row: {
          campo: string | null;
          created_at: string;
          created_by: string | null;
          created_by_nome: string | null;
          etp_id: string;
          id: string;
          mensagem: string | null;
          tipo: Database["public"]["Enums"]["etp_historico_tipo"];
          valor_anterior: string | null;
          valor_novo: string | null;
        };
        Insert: {
          campo?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_nome?: string | null;
          etp_id: string;
          id?: string;
          mensagem?: string | null;
          tipo: Database["public"]["Enums"]["etp_historico_tipo"];
          valor_anterior?: string | null;
          valor_novo?: string | null;
        };
        Update: {
          campo?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_nome?: string | null;
          etp_id?: string;
          id?: string;
          mensagem?: string | null;
          tipo?: Database["public"]["Enums"]["etp_historico_tipo"];
          valor_anterior?: string | null;
          valor_novo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_etp_historico_etp_id_fkey";
            columns: ["etp_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_etps";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_etps: {
        Row: {
          aprovado_em: string | null;
          aprovado_por: string | null;
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          criterios_aceite: string | null;
          deleted_at: string | null;
          drive_file_id: string | null;
          drive_view_url: string | null;
          equipamento_id: string;
          escopo: string | null;
          id: string;
          observacoes: string | null;
          premissas: string | null;
          requisitos_funcionais: string | null;
          requisitos_tecnicos: string | null;
          riscos: string | null;
          status: Database["public"]["Enums"]["etp_status"];
          updated_at: string;
          updated_by: string | null;
          versao: number;
        };
        Insert: {
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          criterios_aceite?: string | null;
          deleted_at?: string | null;
          drive_file_id?: string | null;
          drive_view_url?: string | null;
          equipamento_id: string;
          escopo?: string | null;
          id?: string;
          observacoes?: string | null;
          premissas?: string | null;
          requisitos_funcionais?: string | null;
          requisitos_tecnicos?: string | null;
          riscos?: string | null;
          status?: Database["public"]["Enums"]["etp_status"];
          updated_at?: string;
          updated_by?: string | null;
          versao?: number;
        };
        Update: {
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          criterios_aceite?: string | null;
          deleted_at?: string | null;
          drive_file_id?: string | null;
          drive_view_url?: string | null;
          equipamento_id?: string;
          escopo?: string | null;
          id?: string;
          observacoes?: string | null;
          premissas?: string | null;
          requisitos_funcionais?: string | null;
          requisitos_tecnicos?: string | null;
          riscos?: string | null;
          status?: Database["public"]["Enums"]["etp_status"];
          updated_at?: string;
          updated_by?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_etps_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_etps_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_import_historico: {
        Row: {
          arquivo_nome: string | null;
          created_at: string;
          descricao: string;
          diff: Json;
          disciplina: string | null;
          equipamento_id: string;
          id: string;
          tipo: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          arquivo_nome?: string | null;
          created_at?: string;
          descricao: string;
          diff?: Json;
          disciplina?: string | null;
          equipamento_id: string;
          id?: string;
          tipo: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          arquivo_nome?: string | null;
          created_at?: string;
          descricao?: string;
          diff?: Json;
          disciplina?: string | null;
          equipamento_id?: string;
          id?: string;
          tipo?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_import_historico_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_montagens: {
        Row: {
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          equipamento_id: string;
          fim_previsto: string | null;
          fim_real: string | null;
          id: string;
          inicio_previsto: string | null;
          inicio_real: string | null;
          observacoes: string | null;
          progresso: number;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["montagem_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          equipamento_id: string;
          fim_previsto?: string | null;
          fim_real?: string | null;
          id?: string;
          inicio_previsto?: string | null;
          inicio_real?: string | null;
          observacoes?: string | null;
          progresso?: number;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["montagem_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          equipamento_id?: string;
          fim_previsto?: string | null;
          fim_real?: string | null;
          id?: string;
          inicio_previsto?: string | null;
          inicio_real?: string | null;
          observacoes?: string | null;
          progresso?: number;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["montagem_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_montagens_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_montagens_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_pagina: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          og_image_url: string | null;
          publicado: boolean;
          seo_description_en: string | null;
          seo_description_es: string | null;
          seo_description_pt: string | null;
          seo_title_en: string | null;
          seo_title_es: string | null;
          seo_title_pt: string | null;
          slug: string;
          tipo_id: string;
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          og_image_url?: string | null;
          publicado?: boolean;
          seo_description_en?: string | null;
          seo_description_es?: string | null;
          seo_description_pt?: string | null;
          seo_title_en?: string | null;
          seo_title_es?: string | null;
          seo_title_pt?: string | null;
          slug: string;
          tipo_id: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          og_image_url?: string | null;
          publicado?: boolean;
          seo_description_en?: string | null;
          seo_description_es?: string | null;
          seo_description_pt?: string | null;
          seo_title_en?: string | null;
          seo_title_es?: string | null;
          seo_title_pt?: string | null;
          slug?: string;
          tipo_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_pagina_tipo_id_fkey";
            columns: ["tipo_id"];
            isOneToOne: true;
            referencedRelation: "rfq_formulario_tipo";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_pagina_bloco: {
        Row: {
          atualizado_em: string;
          conteudo_json: Json;
          criado_em: string;
          id: string;
          ordem: number;
          pagina_id: string;
          tipo_bloco: string;
          visivel: boolean;
        };
        Insert: {
          atualizado_em?: string;
          conteudo_json?: Json;
          criado_em?: string;
          id?: string;
          ordem?: number;
          pagina_id: string;
          tipo_bloco: string;
          visivel?: boolean;
        };
        Update: {
          atualizado_em?: string;
          conteudo_json?: Json;
          criado_em?: string;
          id?: string;
          ordem?: number;
          pagina_id?: string;
          tipo_bloco?: string;
          visivel?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_pagina_bloco_pagina_id_fkey";
            columns: ["pagina_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_pagina";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_planejamento_itens: {
        Row: {
          created_at: string;
          descricao: string | null;
          id: string;
          obrigatorio: boolean;
          ordem: number;
          secao_id: string;
          tipo: string;
          titulo: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          obrigatorio?: boolean;
          ordem?: number;
          secao_id: string;
          tipo?: string;
          titulo: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          obrigatorio?: boolean;
          ordem?: number;
          secao_id?: string;
          tipo?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_planejamento_itens_secao_id_fkey";
            columns: ["secao_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_planejamento_secoes";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_planejamento_secoes: {
        Row: {
          area: string;
          created_at: string;
          id: string;
          ordem: number;
          template_id: string;
          titulo: string;
        };
        Insert: {
          area?: string;
          created_at?: string;
          id?: string;
          ordem?: number;
          template_id: string;
          titulo: string;
        };
        Update: {
          area?: string;
          created_at?: string;
          id?: string;
          ordem?: number;
          template_id?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_planejamento_secoes_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_planejamento_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_planejamento_status: {
        Row: {
          created_at: string;
          done: boolean;
          done_at: string | null;
          done_by: string | null;
          done_by_nome: string | null;
          equipamento_id: string;
          id: string;
          item_id: string;
          updated_at: string;
          valor: string | null;
        };
        Insert: {
          created_at?: string;
          done?: boolean;
          done_at?: string | null;
          done_by?: string | null;
          done_by_nome?: string | null;
          equipamento_id: string;
          id?: string;
          item_id: string;
          updated_at?: string;
          valor?: string | null;
        };
        Update: {
          created_at?: string;
          done?: boolean;
          done_at?: string | null;
          done_by?: string | null;
          done_by_nome?: string | null;
          equipamento_id?: string;
          id?: string;
          item_id?: string;
          updated_at?: string;
          valor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_planejamento_status_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_planejamento_status_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_planejamento_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_planejamento_templates: {
        Row: {
          created_at: string;
          descricao: string | null;
          familia: string | null;
          id: string;
          nome: string;
          publicado: boolean;
          slug: string;
          tipo_rfq_id: string | null;
          updated_at: string;
          versao: number;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          familia?: string | null;
          id?: string;
          nome: string;
          publicado?: boolean;
          slug: string;
          tipo_rfq_id?: string | null;
          updated_at?: string;
          versao?: number;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          familia?: string | null;
          id?: string;
          nome?: string;
          publicado?: boolean;
          slug?: string;
          tipo_rfq_id?: string | null;
          updated_at?: string;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_planejamento_templates_tipo_rfq_id_fkey";
            columns: ["tipo_rfq_id"];
            isOneToOne: false;
            referencedRelation: "rfq_formulario_tipo";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_projetos: {
        Row: {
          briefing_snapshot: Json | null;
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          disciplina: Database["public"]["Enums"]["projeto_disciplina"];
          equipamento_id: string;
          fase: Database["public"]["Enums"]["projeto_fase"];
          hh_consumida: number;
          id: string;
          liberado_em: string | null;
          liberado_por: string | null;
          montagem_id: string | null;
          observacoes: string | null;
          oportunidade_id: string | null;
          pacote_revisao_id: string | null;
          processo_id: string | null;
          progresso: number;
          responsavel_id: string | null;
          revisao: string;
          status: Database["public"]["Enums"]["projeto_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          briefing_snapshot?: Json | null;
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          disciplina: Database["public"]["Enums"]["projeto_disciplina"];
          equipamento_id: string;
          fase?: Database["public"]["Enums"]["projeto_fase"];
          hh_consumida?: number;
          id?: string;
          liberado_em?: string | null;
          liberado_por?: string | null;
          montagem_id?: string | null;
          observacoes?: string | null;
          oportunidade_id?: string | null;
          pacote_revisao_id?: string | null;
          processo_id?: string | null;
          progresso?: number;
          responsavel_id?: string | null;
          revisao?: string;
          status?: Database["public"]["Enums"]["projeto_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          briefing_snapshot?: Json | null;
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          disciplina?: Database["public"]["Enums"]["projeto_disciplina"];
          equipamento_id?: string;
          fase?: Database["public"]["Enums"]["projeto_fase"];
          hh_consumida?: number;
          id?: string;
          liberado_em?: string | null;
          liberado_por?: string | null;
          montagem_id?: string | null;
          observacoes?: string | null;
          oportunidade_id?: string | null;
          pacote_revisao_id?: string | null;
          processo_id?: string | null;
          progresso?: number;
          responsavel_id?: string | null;
          revisao?: string;
          status?: Database["public"]["Enums"]["projeto_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_projetos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_projetos_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_projetos_montagem_id_fkey";
            columns: ["montagem_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_montagens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_projetos_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_projetos_pacote_revisao_id_fkey";
            columns: ["pacote_revisao_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_revisoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_projetos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      equipamento_revisoes: {
        Row: {
          cliente_id: string;
          created_at: string;
          created_by: string | null;
          data_inspecao: string | null;
          deleted_at: string | null;
          disciplina: Database["public"]["Enums"]["revisao_disciplina"];
          equipamento_id: string;
          id: string;
          inspetor_id: string | null;
          itens_totais: number;
          itens_verificados: number;
          nao_conformidades: number;
          numero: number;
          observacoes: string | null;
          projeto_id: string | null;
          status: Database["public"]["Enums"]["revisao_status"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          created_by?: string | null;
          data_inspecao?: string | null;
          deleted_at?: string | null;
          disciplina: Database["public"]["Enums"]["revisao_disciplina"];
          equipamento_id: string;
          id?: string;
          inspetor_id?: string | null;
          itens_totais?: number;
          itens_verificados?: number;
          nao_conformidades?: number;
          numero?: number;
          observacoes?: string | null;
          projeto_id?: string | null;
          status?: Database["public"]["Enums"]["revisao_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          created_by?: string | null;
          data_inspecao?: string | null;
          deleted_at?: string | null;
          disciplina?: Database["public"]["Enums"]["revisao_disciplina"];
          equipamento_id?: string;
          id?: string;
          inspetor_id?: string | null;
          itens_totais?: number;
          itens_verificados?: number;
          nao_conformidades?: number;
          numero?: number;
          observacoes?: string | null;
          projeto_id?: string | null;
          status?: Database["public"]["Enums"]["revisao_status"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipamento_revisoes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_revisoes_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipamento_revisoes_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
        ];
      };
      etapa_template: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          descricao: string | null;
          familia: string | null;
          id: string;
          nome: string;
          publicado: boolean;
          slug: string;
          tipo_id: string | null;
          updated_at: string;
          updated_by: string | null;
          versao_atual: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          familia?: string | null;
          id?: string;
          nome: string;
          publicado?: boolean;
          slug: string;
          tipo_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          versao_atual?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          familia?: string | null;
          id?: string;
          nome?: string;
          publicado?: boolean;
          slug?: string;
          tipo_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          versao_atual?: number;
        };
        Relationships: [
          {
            foreignKeyName: "etapa_template_tipo_id_fkey";
            columns: ["tipo_id"];
            isOneToOne: false;
            referencedRelation: "rfq_formulario_tipo";
            referencedColumns: ["id"];
          },
        ];
      };
      etapa_template_bom_item: {
        Row: {
          codigo: string | null;
          criticidade: string;
          deleted_at: string | null;
          descricao: string;
          disciplina_projeto: string;
          equipamento_disciplina: string;
          fabricante: string | null;
          id: string;
          link: string | null;
          observacoes: string | null;
          ordem: number;
          part_number: string | null;
          quantidade: number;
          template_id: string;
          unidade: string;
        };
        Insert: {
          codigo?: string | null;
          criticidade?: string;
          deleted_at?: string | null;
          descricao: string;
          disciplina_projeto?: string;
          equipamento_disciplina?: string;
          fabricante?: string | null;
          id?: string;
          link?: string | null;
          observacoes?: string | null;
          ordem?: number;
          part_number?: string | null;
          quantidade?: number;
          template_id: string;
          unidade?: string;
        };
        Update: {
          codigo?: string | null;
          criticidade?: string;
          deleted_at?: string | null;
          descricao?: string;
          disciplina_projeto?: string;
          equipamento_disciplina?: string;
          fabricante?: string | null;
          id?: string;
          link?: string | null;
          observacoes?: string | null;
          ordem?: number;
          part_number?: string | null;
          quantidade?: number;
          template_id?: string;
          unidade?: string;
        };
        Relationships: [
          {
            foreignKeyName: "etapa_template_bom_item_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "etapa_template";
            referencedColumns: ["id"];
          },
        ];
      };
      etapa_template_item: {
        Row: {
          checklist: Json;
          codigo: string | null;
          deleted_at: string | null;
          depende_de: string | null;
          descricao: string | null;
          disciplina: string;
          duracao_h: number | null;
          entregavel: string | null;
          id: string;
          ordem: number;
          parent_id: string | null;
          prioridade: string;
          requer_anexo: boolean;
          responsavel_role: string | null;
          template_id: string;
          titulo: string;
        };
        Insert: {
          checklist?: Json;
          codigo?: string | null;
          deleted_at?: string | null;
          depende_de?: string | null;
          descricao?: string | null;
          disciplina: string;
          duracao_h?: number | null;
          entregavel?: string | null;
          id?: string;
          ordem?: number;
          parent_id?: string | null;
          prioridade?: string;
          requer_anexo?: boolean;
          responsavel_role?: string | null;
          template_id: string;
          titulo: string;
        };
        Update: {
          checklist?: Json;
          codigo?: string | null;
          deleted_at?: string | null;
          depende_de?: string | null;
          descricao?: string | null;
          disciplina?: string;
          duracao_h?: number | null;
          entregavel?: string | null;
          id?: string;
          ordem?: number;
          parent_id?: string | null;
          prioridade?: string;
          requer_anexo?: boolean;
          responsavel_role?: string | null;
          template_id?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "etapa_template_item_depende_de_fkey";
            columns: ["depende_de"];
            isOneToOne: false;
            referencedRelation: "etapa_template_item";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "etapa_template_item_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "etapa_template_item";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "etapa_template_item_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "etapa_template";
            referencedColumns: ["id"];
          },
        ];
      };
      etapa_template_versao: {
        Row: {
          actor_nome: string | null;
          actor_user_id: string | null;
          comentario: string | null;
          created_at: string;
          id: string;
          snapshot: Json;
          template_id: string;
          versao: number;
        };
        Insert: {
          actor_nome?: string | null;
          actor_user_id?: string | null;
          comentario?: string | null;
          created_at?: string;
          id?: string;
          snapshot: Json;
          template_id: string;
          versao: number;
        };
        Update: {
          actor_nome?: string | null;
          actor_user_id?: string | null;
          comentario?: string | null;
          created_at?: string;
          id?: string;
          snapshot?: Json;
          template_id?: string;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "etapa_template_versao_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "etapa_template";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_anexo: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao: string | null;
          drive_file_id: string | null;
          drive_folder_id: string | null;
          drive_view_url: string | null;
          fat_id: string;
          id: string;
          item_id: string | null;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          secao_id: string | null;
          storage_path: string | null;
          tamanho_bytes: number;
          tipo_anexo: string;
          updated_at: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          fat_id: string;
          id?: string;
          item_id?: string | null;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          secao_id?: string | null;
          storage_path?: string | null;
          tamanho_bytes: number;
          tipo_anexo?: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          fat_id?: string;
          id?: string;
          item_id?: string | null;
          mime_type?: string;
          nome_final?: string;
          nome_original?: string;
          secao_id?: string | null;
          storage_path?: string | null;
          tamanho_bytes?: number;
          tipo_anexo?: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fat_anexo_fat_id_fkey";
            columns: ["fat_id"];
            isOneToOne: false;
            referencedRelation: "fat_relatorios";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_assinaturas: {
        Row: {
          assinado_em: string;
          assinado_ip: string | null;
          assinatura_svg: string;
          cargo: string | null;
          fat_id: string;
          hash_sha256: string;
          id: string;
          nome: string;
          tipo: Database["public"]["Enums"]["fat_assinatura_tipo"];
        };
        Insert: {
          assinado_em?: string;
          assinado_ip?: string | null;
          assinatura_svg: string;
          cargo?: string | null;
          fat_id: string;
          hash_sha256: string;
          id?: string;
          nome: string;
          tipo: Database["public"]["Enums"]["fat_assinatura_tipo"];
        };
        Update: {
          assinado_em?: string;
          assinado_ip?: string | null;
          assinatura_svg?: string;
          cargo?: string | null;
          fat_id?: string;
          hash_sha256?: string;
          id?: string;
          nome?: string;
          tipo?: Database["public"]["Enums"]["fat_assinatura_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "fat_assinaturas_fat_id_fkey";
            columns: ["fat_id"];
            isOneToOne: false;
            referencedRelation: "fat_relatorios";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_checklist_resposta: {
        Row: {
          comentario: string | null;
          created_at: string;
          fat_id: string;
          foto_path: string | null;
          id: string;
          status: Database["public"]["Enums"]["fat_item_status"];
          template_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          comentario?: string | null;
          created_at?: string;
          fat_id: string;
          foto_path?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["fat_item_status"];
          template_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          comentario?: string | null;
          created_at?: string;
          fat_id?: string;
          foto_path?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["fat_item_status"];
          template_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fat_checklist_resposta_fat_id_fkey";
            columns: ["fat_id"];
            isOneToOne: false;
            referencedRelation: "fat_relatorios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fat_checklist_resposta_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "fat_checklist_template";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_checklist_template: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          id: string;
          ordem: number;
          requer_foto_nok: boolean;
          secao: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          requer_foto_nok?: boolean;
          secao: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          requer_foto_nok?: boolean;
          secao?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fat_medicoes: {
        Row: {
          created_at: string;
          fat_id: string;
          id: string;
          medido: number | null;
          nominal: number | null;
          ordem: number;
          parametro: string;
          status_auto: string | null;
          tolerancia: string | null;
          unidade: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          fat_id: string;
          id?: string;
          medido?: number | null;
          nominal?: number | null;
          ordem?: number;
          parametro: string;
          status_auto?: string | null;
          tolerancia?: string | null;
          unidade?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          fat_id?: string;
          id?: string;
          medido?: number | null;
          nominal?: number | null;
          ordem?: number;
          parametro?: string;
          status_auto?: string | null;
          tolerancia?: string | null;
          unidade?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fat_medicoes_fat_id_fkey";
            columns: ["fat_id"];
            isOneToOne: false;
            referencedRelation: "fat_relatorios";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_relatorios: {
        Row: {
          cliente_id: string;
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          data_ensaio: string | null;
          deleted_at: string | null;
          homologado_em: string | null;
          homologado_por: string | null;
          hora_inicio: string | null;
          id: string;
          inspetor_id: string | null;
          local_ensaio: string | null;
          motivos_viagem: string[];
          na_count: number;
          nok_count: number;
          observacoes_gerais: string | null;
          ok_count: number;
          os_codigo: string | null;
          periodo_ate: string | null;
          periodo_de: string | null;
          processo_id: string;
          progresso: number;
          status: Database["public"]["Enums"]["fat_status"];
          tag_equipamento: string | null;
          tecnicos: string | null;
          temperatura_c: number | null;
          tensao_alimentacao: string | null;
          testemunha_nome: string | null;
          umidade_rel: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cliente_id: string;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_ensaio?: string | null;
          deleted_at?: string | null;
          homologado_em?: string | null;
          homologado_por?: string | null;
          hora_inicio?: string | null;
          id?: string;
          inspetor_id?: string | null;
          local_ensaio?: string | null;
          motivos_viagem?: string[];
          na_count?: number;
          nok_count?: number;
          observacoes_gerais?: string | null;
          ok_count?: number;
          os_codigo?: string | null;
          periodo_ate?: string | null;
          periodo_de?: string | null;
          processo_id: string;
          progresso?: number;
          status?: Database["public"]["Enums"]["fat_status"];
          tag_equipamento?: string | null;
          tecnicos?: string | null;
          temperatura_c?: number | null;
          tensao_alimentacao?: string | null;
          testemunha_nome?: string | null;
          umidade_rel?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cliente_id?: string;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_ensaio?: string | null;
          deleted_at?: string | null;
          homologado_em?: string | null;
          homologado_por?: string | null;
          hora_inicio?: string | null;
          id?: string;
          inspetor_id?: string | null;
          local_ensaio?: string | null;
          motivos_viagem?: string[];
          na_count?: number;
          nok_count?: number;
          observacoes_gerais?: string | null;
          ok_count?: number;
          os_codigo?: string | null;
          periodo_ate?: string | null;
          periodo_de?: string | null;
          processo_id?: string;
          progresso?: number;
          status?: Database["public"]["Enums"]["fat_status"];
          tag_equipamento?: string | null;
          tecnicos?: string | null;
          temperatura_c?: number | null;
          tensao_alimentacao?: string | null;
          testemunha_nome?: string | null;
          umidade_rel?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fat_relatorios_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fat_relatorios_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_rnc: {
        Row: {
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          fat_id: string;
          id: string;
          origem_medicao_id: string | null;
          origem_resposta_id: string | null;
          plano_acao: string | null;
          prazo: string | null;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["fat_rnc_status"];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          fat_id: string;
          id?: string;
          origem_medicao_id?: string | null;
          origem_resposta_id?: string | null;
          plano_acao?: string | null;
          prazo?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["fat_rnc_status"];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          fat_id?: string;
          id?: string;
          origem_medicao_id?: string | null;
          origem_resposta_id?: string | null;
          plano_acao?: string | null;
          prazo?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["fat_rnc_status"];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fat_rnc_fat_id_fkey";
            columns: ["fat_id"];
            isOneToOne: false;
            referencedRelation: "fat_relatorios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fat_rnc_origem_medicao_id_fkey";
            columns: ["origem_medicao_id"];
            isOneToOne: false;
            referencedRelation: "fat_medicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fat_rnc_origem_resposta_id_fkey";
            columns: ["origem_resposta_id"];
            isOneToOne: false;
            referencedRelation: "fat_checklist_resposta";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_template: {
        Row: {
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao: string | null;
          id: string;
          nome: string;
          updated_at: string;
          updated_by: string | null;
          versao: number;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          id?: string;
          nome: string;
          updated_at?: string;
          updated_by?: string | null;
          versao: number;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          id?: string;
          nome?: string;
          updated_at?: string;
          updated_by?: string | null;
          versao?: number;
        };
        Relationships: [];
      };
      fat_template_item: {
        Row: {
          ajuda: string | null;
          created_at: string;
          id: string;
          label: string;
          obrigatorio: boolean;
          opcoes: Json;
          ordem: number;
          permite_anexo: boolean;
          permite_comentario: boolean;
          requer_foto_nok: boolean;
          secao_id: string;
          tipo: Database["public"]["Enums"]["fat_item_tipo"];
          updated_at: string;
        };
        Insert: {
          ajuda?: string | null;
          created_at?: string;
          id?: string;
          label: string;
          obrigatorio?: boolean;
          opcoes?: Json;
          ordem?: number;
          permite_anexo?: boolean;
          permite_comentario?: boolean;
          requer_foto_nok?: boolean;
          secao_id: string;
          tipo?: Database["public"]["Enums"]["fat_item_tipo"];
          updated_at?: string;
        };
        Update: {
          ajuda?: string | null;
          created_at?: string;
          id?: string;
          label?: string;
          obrigatorio?: boolean;
          opcoes?: Json;
          ordem?: number;
          permite_anexo?: boolean;
          permite_comentario?: boolean;
          requer_foto_nok?: boolean;
          secao_id?: string;
          tipo?: Database["public"]["Enums"]["fat_item_tipo"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fat_template_item_secao_id_fkey";
            columns: ["secao_id"];
            isOneToOne: false;
            referencedRelation: "fat_template_secao";
            referencedColumns: ["id"];
          },
        ];
      };
      fat_template_secao: {
        Row: {
          created_at: string;
          descricao: string | null;
          id: string;
          ordem: number;
          template_id: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          template_id: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          template_id?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fat_template_secao_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "fat_template";
            referencedColumns: ["id"];
          },
        ];
      };
      form_inbox_status: {
        Row: {
          entity_id: string;
          entity_type: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          entity_id: string;
          entity_type: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          entity_id?: string;
          entity_type?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      fornecedor_anexos: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          descricao: string | null;
          fornecedor_id: string;
          id: string;
          mime: string | null;
          nome_final: string;
          nome_original: string;
          storage_bucket: string;
          storage_path: string;
          tamanho: number | null;
          tipo: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          fornecedor_id: string;
          id?: string;
          mime?: string | null;
          nome_final: string;
          nome_original: string;
          storage_bucket?: string;
          storage_path: string;
          tamanho?: number | null;
          tipo?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          fornecedor_id?: string;
          id?: string;
          mime?: string | null;
          nome_final?: string;
          nome_original?: string;
          storage_bucket?: string;
          storage_path?: string;
          tamanho?: number | null;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_anexos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_categoria_link: {
        Row: {
          categoria_slug: string;
          fornecedor_id: string;
        };
        Insert: {
          categoria_slug: string;
          fornecedor_id: string;
        };
        Update: {
          categoria_slug?: string;
          fornecedor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_categoria_link_categoria_slug_fkey";
            columns: ["categoria_slug"];
            isOneToOne: false;
            referencedRelation: "fornecedor_categorias_catalog";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "fornecedor_categoria_link_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_categorias_catalog: {
        Row: {
          ativo: boolean;
          nome_en: string;
          nome_pt: string;
          ordem: number;
          parent_slug: string | null;
          slug: string;
        };
        Insert: {
          ativo?: boolean;
          nome_en: string;
          nome_pt: string;
          ordem?: number;
          parent_slug?: string | null;
          slug: string;
        };
        Update: {
          ativo?: boolean;
          nome_en?: string;
          nome_pt?: string;
          ordem?: number;
          parent_slug?: string | null;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_categorias_catalog_parent_slug_fkey";
            columns: ["parent_slug"];
            isOneToOne: false;
            referencedRelation: "fornecedor_categorias_catalog";
            referencedColumns: ["slug"];
          },
        ];
      };
      fornecedor_contatos: {
        Row: {
          cargo: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          fornecedor_id: string;
          id: string;
          nome: string;
          principal: boolean;
          telefone_ddi: string | null;
          telefone_numero: string | null;
          wechat: string | null;
          whatsapp: string | null;
        };
        Insert: {
          cargo?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          fornecedor_id: string;
          id?: string;
          nome: string;
          principal?: boolean;
          telefone_ddi?: string | null;
          telefone_numero?: string | null;
          wechat?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          cargo?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          fornecedor_id?: string;
          id?: string;
          nome?: string;
          principal?: boolean;
          telefone_ddi?: string | null;
          telefone_numero?: string | null;
          wechat?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_contatos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_notas: {
        Row: {
          created_at: string;
          fornecedor_id: string;
          id: string;
          texto: string;
          tipo: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          created_at?: string;
          fornecedor_id: string;
          id?: string;
          texto: string;
          tipo?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          created_at?: string;
          fornecedor_id?: string;
          id?: string;
          texto?: string;
          tipo?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_notas_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_scan_submissoes: {
        Row: {
          created_at: string;
          created_by: string | null;
          created_by_email: string | null;
          drive_files: Json | null;
          drive_folder_id: string | null;
          endereco_original: string | null;
          enrichment: Json | null;
          error: string | null;
          extracted: Json | null;
          fornecedor_id: string | null;
          id: string;
          imagens_count: number;
          ok: boolean;
          origem: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          created_by_email?: string | null;
          drive_files?: Json | null;
          drive_folder_id?: string | null;
          endereco_original?: string | null;
          enrichment?: Json | null;
          error?: string | null;
          extracted?: Json | null;
          fornecedor_id?: string | null;
          id?: string;
          imagens_count?: number;
          ok?: boolean;
          origem?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          created_by_email?: string | null;
          drive_files?: Json | null;
          drive_folder_id?: string | null;
          endereco_original?: string | null;
          enrichment?: Json | null;
          error?: string | null;
          extracted?: Json | null;
          fornecedor_id?: string | null;
          id?: string;
          imagens_count?: number;
          ok?: boolean;
          origem?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_scan_submissoes_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedores: {
        Row: {
          alibaba_url: string | null;
          auditado_em: string | null;
          auditor: string | null;
          capacidade_mensal: string | null;
          capital_social: number | null;
          certificacoes: string[];
          cidade: string | null;
          cnae_principal: string | null;
          cnaes_secundarios: string[];
          codigo: string;
          condicao_pagamento_dias: number | null;
          created_at: string;
          created_by: string | null;
          data_abertura: string | null;
          deleted_at: string | null;
          email_corporativo: string | null;
          endereco: string | null;
          endereco_cep: string | null;
          endereco_estado_provincia: string | null;
          fabrica_area_m2: number | null;
          funcionarios_faixa: string | null;
          fuso_horario: string | null;
          id: string;
          idioma: string | null;
          incorporation_year: number | null;
          incoterm_padrao: string | null;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          lead_time_dias: number | null;
          legal_name_local: string | null;
          linkedin_url: string | null;
          made_in_china_url: string | null;
          moeda_padrao: string | null;
          moq: number | null;
          motivo_bloqueio: string | null;
          natureza_juridica: string | null;
          nome: string;
          nome_fantasia: string | null;
          observacoes: string | null;
          pais: string;
          palavras_chave: string[];
          payment_terms: string | null;
          porto_origem: string | null;
          proxima_revisao_em: string | null;
          ranking: Database["public"]["Enums"]["fornecedor_ranking"];
          regime_tributario: string | null;
          responsavel_interno_user_id: string | null;
          score_calculado: number | null;
          score_entrega: number | null;
          score_preco: number | null;
          score_qualidade: number | null;
          search_tsv: unknown;
          site: string | null;
          situacao_cadastral: string | null;
          status: Database["public"]["Enums"]["fornecedor_status"];
          tags: string[];
          tax_id: string | null;
          tax_id_tipo: string | null;
          telefone_ddi: string | null;
          telefone_numero: string | null;
          updated_at: string;
          updated_by: string | null;
          wechat_corp: string | null;
          whatsapp_corp: string | null;
        };
        Insert: {
          alibaba_url?: string | null;
          auditado_em?: string | null;
          auditor?: string | null;
          capacidade_mensal?: string | null;
          capital_social?: number | null;
          certificacoes?: string[];
          cidade?: string | null;
          cnae_principal?: string | null;
          cnaes_secundarios?: string[];
          codigo: string;
          condicao_pagamento_dias?: number | null;
          created_at?: string;
          created_by?: string | null;
          data_abertura?: string | null;
          deleted_at?: string | null;
          email_corporativo?: string | null;
          endereco?: string | null;
          endereco_cep?: string | null;
          endereco_estado_provincia?: string | null;
          fabrica_area_m2?: number | null;
          funcionarios_faixa?: string | null;
          fuso_horario?: string | null;
          id?: string;
          idioma?: string | null;
          incorporation_year?: number | null;
          incoterm_padrao?: string | null;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          lead_time_dias?: number | null;
          legal_name_local?: string | null;
          linkedin_url?: string | null;
          made_in_china_url?: string | null;
          moeda_padrao?: string | null;
          moq?: number | null;
          motivo_bloqueio?: string | null;
          natureza_juridica?: string | null;
          nome: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          pais?: string;
          palavras_chave?: string[];
          payment_terms?: string | null;
          porto_origem?: string | null;
          proxima_revisao_em?: string | null;
          ranking?: Database["public"]["Enums"]["fornecedor_ranking"];
          regime_tributario?: string | null;
          responsavel_interno_user_id?: string | null;
          score_calculado?: number | null;
          score_entrega?: number | null;
          score_preco?: number | null;
          score_qualidade?: number | null;
          search_tsv?: unknown;
          site?: string | null;
          situacao_cadastral?: string | null;
          status?: Database["public"]["Enums"]["fornecedor_status"];
          tags?: string[];
          tax_id?: string | null;
          tax_id_tipo?: string | null;
          telefone_ddi?: string | null;
          telefone_numero?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          wechat_corp?: string | null;
          whatsapp_corp?: string | null;
        };
        Update: {
          alibaba_url?: string | null;
          auditado_em?: string | null;
          auditor?: string | null;
          capacidade_mensal?: string | null;
          capital_social?: number | null;
          certificacoes?: string[];
          cidade?: string | null;
          cnae_principal?: string | null;
          cnaes_secundarios?: string[];
          codigo?: string;
          condicao_pagamento_dias?: number | null;
          created_at?: string;
          created_by?: string | null;
          data_abertura?: string | null;
          deleted_at?: string | null;
          email_corporativo?: string | null;
          endereco?: string | null;
          endereco_cep?: string | null;
          endereco_estado_provincia?: string | null;
          fabrica_area_m2?: number | null;
          funcionarios_faixa?: string | null;
          fuso_horario?: string | null;
          id?: string;
          idioma?: string | null;
          incorporation_year?: number | null;
          incoterm_padrao?: string | null;
          inscricao_estadual?: string | null;
          inscricao_municipal?: string | null;
          lead_time_dias?: number | null;
          legal_name_local?: string | null;
          linkedin_url?: string | null;
          made_in_china_url?: string | null;
          moeda_padrao?: string | null;
          moq?: number | null;
          motivo_bloqueio?: string | null;
          natureza_juridica?: string | null;
          nome?: string;
          nome_fantasia?: string | null;
          observacoes?: string | null;
          pais?: string;
          palavras_chave?: string[];
          payment_terms?: string | null;
          porto_origem?: string | null;
          proxima_revisao_em?: string | null;
          ranking?: Database["public"]["Enums"]["fornecedor_ranking"];
          regime_tributario?: string | null;
          responsavel_interno_user_id?: string | null;
          score_calculado?: number | null;
          score_entrega?: number | null;
          score_preco?: number | null;
          score_qualidade?: number | null;
          search_tsv?: unknown;
          site?: string | null;
          situacao_cadastral?: string | null;
          status?: Database["public"]["Enums"]["fornecedor_status"];
          tags?: string[];
          tax_id?: string | null;
          tax_id_tipo?: string | null;
          telefone_ddi?: string | null;
          telefone_numero?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          wechat_corp?: string | null;
          whatsapp_corp?: string | null;
        };
        Relationships: [];
      };
      gemini_scan_log: {
        Row: {
          code: string | null;
          created_at: string;
          duration_ms: number | null;
          endpoint: string;
          id: string;
          imagens_count: number | null;
          message: string | null;
          ok: boolean;
          provider_message: string | null;
          request_context: string | null;
          status: number | null;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          endpoint?: string;
          id?: string;
          imagens_count?: number | null;
          message?: string | null;
          ok: boolean;
          provider_message?: string | null;
          request_context?: string | null;
          status?: number | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          endpoint?: string;
          id?: string;
          imagens_count?: number | null;
          message?: string | null;
          ok?: boolean;
          provider_message?: string | null;
          request_context?: string | null;
          status?: number | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      insumo_anexos: {
        Row: {
          condicao_pagamento: string | null;
          criado_em: string;
          deleted_at: string | null;
          drive_file_id: string | null;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          drive_view_url: string | null;
          file_name: string;
          fornecedor_id: string | null;
          id: string;
          incoterm: string | null;
          insumo_id: string;
          kind: string;
          lead_time_dias: number | null;
          mime_type: string | null;
          moeda: string | null;
          observacoes: string | null;
          original_name: string | null;
          size_bytes: number | null;
          uploaded_by: string | null;
          uploaded_by_nome: string | null;
          validade_ate: string | null;
          valor: number | null;
        };
        Insert: {
          condicao_pagamento?: string | null;
          criado_em?: string;
          deleted_at?: string | null;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          drive_view_url?: string | null;
          file_name: string;
          fornecedor_id?: string | null;
          id?: string;
          incoterm?: string | null;
          insumo_id: string;
          kind?: string;
          lead_time_dias?: number | null;
          mime_type?: string | null;
          moeda?: string | null;
          observacoes?: string | null;
          original_name?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          uploaded_by_nome?: string | null;
          validade_ate?: string | null;
          valor?: number | null;
        };
        Update: {
          condicao_pagamento?: string | null;
          criado_em?: string;
          deleted_at?: string | null;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          drive_view_url?: string | null;
          file_name?: string;
          fornecedor_id?: string | null;
          id?: string;
          incoterm?: string | null;
          insumo_id?: string;
          kind?: string;
          lead_time_dias?: number | null;
          mime_type?: string | null;
          moeda?: string | null;
          observacoes?: string | null;
          original_name?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          uploaded_by_nome?: string | null;
          validade_ate?: string | null;
          valor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "insumo_anexos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insumo_anexos_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      insumo_aprovacoes_oc: {
        Row: {
          created_at: string;
          decidido_em: string | null;
          decidido_por: string | null;
          decisao: string | null;
          decisao_nota: string | null;
          fornecedor_id_sugerido: string | null;
          id: string;
          insumo_id: string;
          solicitacao_nota: string | null;
          solicitado_em: string;
          solicitado_por: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          decidido_em?: string | null;
          decidido_por?: string | null;
          decisao?: string | null;
          decisao_nota?: string | null;
          fornecedor_id_sugerido?: string | null;
          id?: string;
          insumo_id: string;
          solicitacao_nota?: string | null;
          solicitado_em?: string;
          solicitado_por: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          decidido_em?: string | null;
          decidido_por?: string | null;
          decisao?: string | null;
          decisao_nota?: string | null;
          fornecedor_id_sugerido?: string | null;
          id?: string;
          insumo_id?: string;
          solicitacao_nota?: string | null;
          solicitado_em?: string;
          solicitado_por?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insumo_aprovacoes_oc_fornecedor_id_sugerido_fkey";
            columns: ["fornecedor_id_sugerido"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insumo_aprovacoes_oc_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      insumo_atividades: {
        Row: {
          actor_id: string | null;
          actor_nome: string | null;
          criado_em: string;
          descricao: string | null;
          id: string;
          insumo_id: string;
          meta: Json | null;
          tipo: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_nome?: string | null;
          criado_em?: string;
          descricao?: string | null;
          id?: string;
          insumo_id: string;
          meta?: Json | null;
          tipo: string;
        };
        Update: {
          actor_id?: string | null;
          actor_nome?: string | null;
          criado_em?: string;
          descricao?: string | null;
          id?: string;
          insumo_id?: string;
          meta?: Json | null;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insumo_atividades_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      insumo_documentos_gerados: {
        Row: {
          criado_em: string;
          drive_file_id: string | null;
          drive_folder_id: string | null;
          drive_folder_url: string | null;
          drive_view_url: string | null;
          file_name: string | null;
          fornecedor_id: string | null;
          gerado_por: string | null;
          id: string;
          idioma: string;
          insumo_id: string;
        };
        Insert: {
          criado_em?: string;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          drive_view_url?: string | null;
          file_name?: string | null;
          fornecedor_id?: string | null;
          gerado_por?: string | null;
          id?: string;
          idioma: string;
          insumo_id: string;
        };
        Update: {
          criado_em?: string;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_folder_url?: string | null;
          drive_view_url?: string | null;
          file_name?: string | null;
          fornecedor_id?: string | null;
          gerado_por?: string | null;
          id?: string;
          idioma?: string;
          insumo_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insumo_documentos_gerados_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insumo_documentos_gerados_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      insumo_rfq_envios: {
        Row: {
          canal: Database["public"]["Enums"]["insumo_rfq_canal"];
          created_at: string;
          data_envio: string;
          data_resposta: string | null;
          fornecedor_id: string;
          id: string;
          insumo_id: string;
          notas: string | null;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["insumo_rfq_status"];
          updated_at: string;
        };
        Insert: {
          canal?: Database["public"]["Enums"]["insumo_rfq_canal"];
          created_at?: string;
          data_envio?: string;
          data_resposta?: string | null;
          fornecedor_id: string;
          id?: string;
          insumo_id: string;
          notas?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["insumo_rfq_status"];
          updated_at?: string;
        };
        Update: {
          canal?: Database["public"]["Enums"]["insumo_rfq_canal"];
          created_at?: string;
          data_envio?: string;
          data_resposta?: string | null;
          fornecedor_id?: string;
          id?: string;
          insumo_id?: string;
          notas?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["insumo_rfq_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insumo_rfq_envios_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "insumo_rfq_envios_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
        ];
      };
      integracoes_config: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          disponivel: boolean;
          nome: string;
          ordem: number;
          pais: string;
          provider: string;
          requer_chave: boolean;
          secret_name: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          disponivel?: boolean;
          nome: string;
          ordem?: number;
          pais: string;
          provider: string;
          requer_chave?: boolean;
          secret_name?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          disponivel?: boolean;
          nome?: string;
          ordem?: number;
          pais?: string;
          provider?: string;
          requer_chave?: boolean;
          secret_name?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      kh_colecoes: {
        Row: {
          ativo: boolean;
          cor: string | null;
          created_at: string;
          created_by: string | null;
          descricao: string | null;
          id: string;
          nome: string;
          ordem: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          cor?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          nome: string;
          ordem?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          cor?: string | null;
          created_at?: string;
          created_by?: string | null;
          descricao?: string | null;
          id?: string;
          nome?: string;
          ordem?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kh_favoritos: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kh_favoritos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "kh_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      kh_item_versoes: {
        Row: {
          corpo: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          item_id: string;
          midia_url: string | null;
          resumo: string | null;
          titulo: string | null;
          versao: number;
        };
        Insert: {
          corpo?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id: string;
          midia_url?: string | null;
          resumo?: string | null;
          titulo?: string | null;
          versao: number;
        };
        Update: {
          corpo?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_id?: string;
          midia_url?: string | null;
          resumo?: string | null;
          titulo?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "kh_item_versoes_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "kh_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      kh_itens: {
        Row: {
          aprovado_em: string | null;
          aprovado_por: string | null;
          atualizado_em: string;
          colecao_id: string;
          corpo: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          midia_url: string | null;
          papeis_alvo: string[];
          resumo: string | null;
          revisor_id: string | null;
          slug: string;
          status: Database["public"]["Enums"]["kh_item_status"];
          tags: string[];
          tipo: Database["public"]["Enums"]["kh_item_tipo"];
          titulo: string;
          versao: number;
        };
        Insert: {
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          atualizado_em?: string;
          colecao_id: string;
          corpo?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          midia_url?: string | null;
          papeis_alvo?: string[];
          resumo?: string | null;
          revisor_id?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["kh_item_status"];
          tags?: string[];
          tipo?: Database["public"]["Enums"]["kh_item_tipo"];
          titulo: string;
          versao?: number;
        };
        Update: {
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          atualizado_em?: string;
          colecao_id?: string;
          corpo?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          midia_url?: string | null;
          papeis_alvo?: string[];
          resumo?: string | null;
          revisor_id?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["kh_item_status"];
          tags?: string[];
          tipo?: Database["public"]["Enums"]["kh_item_tipo"];
          titulo?: string;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "kh_itens_colecao_id_fkey";
            columns: ["colecao_id"];
            isOneToOne: false;
            referencedRelation: "kh_colecoes";
            referencedColumns: ["id"];
          },
        ];
      };
      kh_visualizacoes: {
        Row: {
          id: string;
          item_id: string;
          user_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kh_visualizacoes_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "kh_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_origens: {
        Row: {
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          nome: string;
          nome_norm: string | null;
          ordem: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          nome: string;
          nome_norm?: string | null;
          ordem?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          nome?: string;
          nome_norm?: string | null;
          ordem?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      logistica_embarque_anexos: {
        Row: {
          categoria: string;
          created_at: string;
          created_by: string | null;
          embarque_id: string;
          id: string;
          mime_type: string | null;
          nome_arquivo: string;
          storage_path: string;
          tamanho_bytes: number | null;
        };
        Insert: {
          categoria?: string;
          created_at?: string;
          created_by?: string | null;
          embarque_id: string;
          id?: string;
          mime_type?: string | null;
          nome_arquivo: string;
          storage_path: string;
          tamanho_bytes?: number | null;
        };
        Update: {
          categoria?: string;
          created_at?: string;
          created_by?: string | null;
          embarque_id?: string;
          id?: string;
          mime_type?: string | null;
          nome_arquivo?: string;
          storage_path?: string;
          tamanho_bytes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "logistica_embarque_anexos_embarque_id_fkey";
            columns: ["embarque_id"];
            isOneToOne: false;
            referencedRelation: "logistica_embarques";
            referencedColumns: ["id"];
          },
        ];
      };
      logistica_embarque_itens: {
        Row: {
          created_at: string;
          descricao: string;
          embarque_id: string;
          id: string;
          observacoes: string | null;
          ordem: number;
          peso_kg: number | null;
          quantidade: number;
          serial: string | null;
          unidade: string | null;
          volume_m3: number | null;
        };
        Insert: {
          created_at?: string;
          descricao: string;
          embarque_id: string;
          id?: string;
          observacoes?: string | null;
          ordem?: number;
          peso_kg?: number | null;
          quantidade?: number;
          serial?: string | null;
          unidade?: string | null;
          volume_m3?: number | null;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          embarque_id?: string;
          id?: string;
          observacoes?: string | null;
          ordem?: number;
          peso_kg?: number | null;
          quantidade?: number;
          serial?: string | null;
          unidade?: string | null;
          volume_m3?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "logistica_embarque_itens_embarque_id_fkey";
            columns: ["embarque_id"];
            isOneToOne: false;
            referencedRelation: "logistica_embarques";
            referencedColumns: ["id"];
          },
        ];
      };
      logistica_embarque_status_log: {
        Row: {
          anexo_ids: string[];
          changed_at: string;
          changed_by: string | null;
          embarque_id: string;
          from_status: Database["public"]["Enums"]["logistica_embarque_status"] | null;
          id: string;
          notas: string | null;
          to_status: Database["public"]["Enums"]["logistica_embarque_status"];
        };
        Insert: {
          anexo_ids?: string[];
          changed_at?: string;
          changed_by?: string | null;
          embarque_id: string;
          from_status?: Database["public"]["Enums"]["logistica_embarque_status"] | null;
          id?: string;
          notas?: string | null;
          to_status: Database["public"]["Enums"]["logistica_embarque_status"];
        };
        Update: {
          anexo_ids?: string[];
          changed_at?: string;
          changed_by?: string | null;
          embarque_id?: string;
          from_status?: Database["public"]["Enums"]["logistica_embarque_status"] | null;
          id?: string;
          notas?: string | null;
          to_status?: Database["public"]["Enums"]["logistica_embarque_status"];
        };
        Relationships: [
          {
            foreignKeyName: "logistica_embarque_status_log_embarque_id_fkey";
            columns: ["embarque_id"];
            isOneToOne: false;
            referencedRelation: "logistica_embarques";
            referencedColumns: ["id"];
          },
        ];
      };
      logistica_embarques: {
        Row: {
          created_at: string;
          created_by: string | null;
          data_entrega: string | null;
          data_saida: string | null;
          destino: string | null;
          id: string;
          nf_saida: string | null;
          numero: string | null;
          observacoes: string | null;
          previsao_saida: string | null;
          projeto_id: string;
          status: Database["public"]["Enums"]["logistica_embarque_status"];
          transportadora_id: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data_entrega?: string | null;
          data_saida?: string | null;
          destino?: string | null;
          id?: string;
          nf_saida?: string | null;
          numero?: string | null;
          observacoes?: string | null;
          previsao_saida?: string | null;
          projeto_id: string;
          status?: Database["public"]["Enums"]["logistica_embarque_status"];
          transportadora_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data_entrega?: string | null;
          data_saida?: string | null;
          destino?: string | null;
          id?: string;
          nf_saida?: string | null;
          numero?: string | null;
          observacoes?: string | null;
          previsao_saida?: string | null;
          projeto_id?: string;
          status?: Database["public"]["Enums"]["logistica_embarque_status"];
          transportadora_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "logistica_embarques_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "logistica_embarques_transportadora_id_fkey";
            columns: ["transportadora_id"];
            isOneToOne: false;
            referencedRelation: "compras_transportadoras";
            referencedColumns: ["id"];
          },
        ];
      };
      mineracao_campanhas: {
        Row: {
          base_titulo: string | null;
          created_at: string;
          criado_por: string | null;
          end_date: string;
          filtro_contraparte: string | null;
          filtro_empresa: string | null;
          id: string;
          key_country: string;
          key_operation: string;
          key_version: number;
          limite_base: number | null;
          modo: string;
          nome: string | null;
          operacoes: Json;
          pais_destino: string | null;
          pais_origem: string | null;
          rubros: string[];
          start_date: string;
          total_empresas: number;
          total_operacoes: number;
          truncado: boolean;
          valor_total: number;
        };
        Insert: {
          base_titulo?: string | null;
          created_at?: string;
          criado_por?: string | null;
          end_date: string;
          filtro_contraparte?: string | null;
          filtro_empresa?: string | null;
          id?: string;
          key_country: string;
          key_operation: string;
          key_version?: number;
          limite_base?: number | null;
          modo?: string;
          nome?: string | null;
          operacoes?: Json;
          pais_destino?: string | null;
          pais_origem?: string | null;
          rubros?: string[];
          start_date: string;
          total_empresas?: number;
          total_operacoes?: number;
          truncado?: boolean;
          valor_total?: number;
        };
        Update: {
          base_titulo?: string | null;
          created_at?: string;
          criado_por?: string | null;
          end_date?: string;
          filtro_contraparte?: string | null;
          filtro_empresa?: string | null;
          id?: string;
          key_country?: string;
          key_operation?: string;
          key_version?: number;
          limite_base?: number | null;
          modo?: string;
          nome?: string | null;
          operacoes?: Json;
          pais_destino?: string | null;
          pais_origem?: string | null;
          rubros?: string[];
          start_date?: string;
          total_empresas?: number;
          total_operacoes?: number;
          truncado?: boolean;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "mineracao_campanhas_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mineracao_config: {
        Row: {
          api_base_url: string;
          delay_ms: number;
          id: string;
          limite_bases: number;
          limite_bases_premium: number;
          limite_consultas_dia: number;
          limite_empresas: number;
          limite_rubros: number;
          pais_padrao: string | null;
          restricoes_sync: Json | null;
          restricoes_sync_at: string | null;
          senha: string | null;
          singleton: boolean;
          updated_at: string;
          updated_by: string | null;
          usuario: string | null;
        };
        Insert: {
          api_base_url?: string;
          delay_ms?: number;
          id?: string;
          limite_bases?: number;
          limite_bases_premium?: number;
          limite_consultas_dia?: number;
          limite_empresas?: number;
          limite_rubros?: number;
          pais_padrao?: string | null;
          restricoes_sync?: Json | null;
          restricoes_sync_at?: string | null;
          senha?: string | null;
          singleton?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          usuario?: string | null;
        };
        Update: {
          api_base_url?: string;
          delay_ms?: number;
          id?: string;
          limite_bases?: number;
          limite_bases_premium?: number;
          limite_consultas_dia?: number;
          limite_empresas?: number;
          limite_rubros?: number;
          pais_padrao?: string | null;
          restricoes_sync?: Json | null;
          restricoes_sync_at?: string | null;
          senha?: string | null;
          singleton?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          usuario?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mineracao_config_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mineracao_consultas: {
        Row: {
          dia: string;
          total: number;
          updated_at: string;
        };
        Insert: {
          dia: string;
          total?: number;
          updated_at?: string;
        };
        Update: {
          dia?: string;
          total?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      mineracao_resultados: {
        Row: {
          anotacao: string | null;
          campanha_id: string;
          contraparte: string | null;
          convertido_at: string | null;
          convertido_cliente_id: string | null;
          convertido_oportunidade_id: string | null;
          created_at: string;
          documento: string | null;
          empresa: string;
          enviado_para_pipeline: boolean;
          id: string;
          operacoes: number;
          pais: string | null;
          papel: string | null;
          parceiros: Json;
          primeira_operacao: string | null;
          rubros: string[];
          ultima_operacao: string | null;
          valor_total: number;
        };
        Insert: {
          anotacao?: string | null;
          campanha_id: string;
          contraparte?: string | null;
          convertido_at?: string | null;
          convertido_cliente_id?: string | null;
          convertido_oportunidade_id?: string | null;
          created_at?: string;
          documento?: string | null;
          empresa: string;
          enviado_para_pipeline?: boolean;
          id?: string;
          operacoes?: number;
          pais?: string | null;
          papel?: string | null;
          parceiros?: Json;
          primeira_operacao?: string | null;
          rubros?: string[];
          ultima_operacao?: string | null;
          valor_total?: number;
        };
        Update: {
          anotacao?: string | null;
          campanha_id?: string;
          contraparte?: string | null;
          convertido_at?: string | null;
          convertido_cliente_id?: string | null;
          convertido_oportunidade_id?: string | null;
          created_at?: string;
          documento?: string | null;
          empresa?: string;
          enviado_para_pipeline?: boolean;
          id?: string;
          operacoes?: number;
          pais?: string | null;
          papel?: string | null;
          parceiros?: Json;
          primeira_operacao?: string | null;
          rubros?: string[];
          ultima_operacao?: string | null;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "mineracao_resultados_campanha_id_fkey";
            columns: ["campanha_id"];
            isOneToOne: false;
            referencedRelation: "mineracao_campanhas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mineracao_resultados_convertido_cliente_id_fkey";
            columns: ["convertido_cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mineracao_resultados_convertido_oportunidade_id_fkey";
            columns: ["convertido_oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
        ];
      };
      mineracao_uso: {
        Row: {
          ano: number;
          bases: Json;
          bases_premium: Json;
          consultas_por_dia: Json;
          empresas: Json;
          id: string;
          rubros: Json;
          updated_at: string;
        };
        Insert: {
          ano: number;
          bases?: Json;
          bases_premium?: Json;
          consultas_por_dia?: Json;
          empresas?: Json;
          id?: string;
          rubros?: Json;
          updated_at?: string;
        };
        Update: {
          ano?: number;
          bases?: Json;
          bases_premium?: Json;
          consultas_por_dia?: Json;
          empresas?: Json;
          id?: string;
          rubros?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      notificacoes_usuario: {
        Row: {
          created_at: string;
          id: string;
          lida_em: string | null;
          link: string | null;
          mensagem: string | null;
          origem: string;
          origem_id: string | null;
          titulo: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lida_em?: string | null;
          link?: string | null;
          mensagem?: string | null;
          origem: string;
          origem_id?: string | null;
          titulo: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lida_em?: string | null;
          link?: string | null;
          mensagem?: string | null;
          origem?: string;
          origem_id?: string | null;
          titulo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      oportunidade_anexos: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          drive_file_id: string;
          drive_folder_id: string | null;
          drive_view_url: string | null;
          id: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          oportunidade_id: string;
          sugestoes_ia: Json | null;
          tamanho_bytes: number;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_file_id: string;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          id?: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          oportunidade_id: string;
          sugestoes_ia?: Json | null;
          tamanho_bytes: number;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_file_id?: string;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          id?: string;
          mime_type?: string;
          nome_final?: string;
          nome_original?: string;
          oportunidade_id?: string;
          sugestoes_ia?: Json | null;
          tamanho_bytes?: number;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oportunidade_anexos_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
        ];
      };
      oportunidade_notas: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          oportunidade_id: string;
          texto: string;
          updated_at: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          oportunidade_id: string;
          texto: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          oportunidade_id?: string;
          texto?: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "oportunidade_notas_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
        ];
      };
      oportunidade_stage_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          duration_seconds: number | null;
          from_lifecycle: Database["public"]["Enums"]["lifecycle_stage"] | null;
          from_pipeline: Database["public"]["Enums"]["pipeline_stage"] | null;
          id: string;
          oportunidade_id: string;
          to_lifecycle: Database["public"]["Enums"]["lifecycle_stage"];
          to_pipeline: Database["public"]["Enums"]["pipeline_stage"];
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          duration_seconds?: number | null;
          from_lifecycle?: Database["public"]["Enums"]["lifecycle_stage"] | null;
          from_pipeline?: Database["public"]["Enums"]["pipeline_stage"] | null;
          id?: string;
          oportunidade_id: string;
          to_lifecycle: Database["public"]["Enums"]["lifecycle_stage"];
          to_pipeline: Database["public"]["Enums"]["pipeline_stage"];
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          duration_seconds?: number | null;
          from_lifecycle?: Database["public"]["Enums"]["lifecycle_stage"] | null;
          from_pipeline?: Database["public"]["Enums"]["pipeline_stage"] | null;
          id?: string;
          oportunidade_id?: string;
          to_lifecycle?: Database["public"]["Enums"]["lifecycle_stage"];
          to_pipeline?: Database["public"]["Enums"]["pipeline_stage"];
        };
        Relationships: [
          {
            foreignKeyName: "oportunidade_stage_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidade_stage_history_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
        ];
      };
      oportunidades: {
        Row: {
          cliente_id: string | null;
          codigo: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          empresa_lead: string | null;
          expected_close_date: string | null;
          id: string;
          idempotency_key: string | null;
          lifecycle_stage: Database["public"]["Enums"]["lifecycle_stage"];
          lost_at: string | null;
          lost_by: string | null;
          lost_count: number;
          lost_reason: string | null;
          nome_lead: string | null;
          observacoes: string | null;
          origem_id: string | null;
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"];
          probabilidade: number;
          processo_id: string | null;
          responsavel_id: string;
          restored_at: string | null;
          restored_by: string | null;
          rfq_submissao_id: string | null;
          segmento_id: string | null;
          stage_entered_at: string;
          telefone: string | null;
          titulo: string;
          updated_at: string;
          updated_by: string | null;
          valor_estimado: number | null;
          valor_estimado_usd: number | null;
        };
        Insert: {
          cliente_id?: string | null;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          empresa_lead?: string | null;
          expected_close_date?: string | null;
          id?: string;
          idempotency_key?: string | null;
          lifecycle_stage?: Database["public"]["Enums"]["lifecycle_stage"];
          lost_at?: string | null;
          lost_by?: string | null;
          lost_count?: number;
          lost_reason?: string | null;
          nome_lead?: string | null;
          observacoes?: string | null;
          origem_id?: string | null;
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          probabilidade?: number;
          processo_id?: string | null;
          responsavel_id: string;
          restored_at?: string | null;
          restored_by?: string | null;
          rfq_submissao_id?: string | null;
          segmento_id?: string | null;
          stage_entered_at?: string;
          telefone?: string | null;
          titulo: string;
          updated_at?: string;
          updated_by?: string | null;
          valor_estimado?: number | null;
          valor_estimado_usd?: number | null;
        };
        Update: {
          cliente_id?: string | null;
          codigo?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          empresa_lead?: string | null;
          expected_close_date?: string | null;
          id?: string;
          idempotency_key?: string | null;
          lifecycle_stage?: Database["public"]["Enums"]["lifecycle_stage"];
          lost_at?: string | null;
          lost_by?: string | null;
          lost_count?: number;
          lost_reason?: string | null;
          nome_lead?: string | null;
          observacoes?: string | null;
          origem_id?: string | null;
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          probabilidade?: number;
          processo_id?: string | null;
          responsavel_id?: string;
          restored_at?: string | null;
          restored_by?: string | null;
          rfq_submissao_id?: string | null;
          segmento_id?: string | null;
          stage_entered_at?: string;
          telefone?: string | null;
          titulo?: string;
          updated_at?: string;
          updated_by?: string | null;
          valor_estimado?: number | null;
          valor_estimado_usd?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_origem_id_fkey";
            columns: ["origem_id"];
            isOneToOne: false;
            referencedRelation: "lead_origens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_rfq_submissao_id_fkey";
            columns: ["rfq_submissao_id"];
            isOneToOne: false;
            referencedRelation: "rfq_submissao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oportunidades_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ordem_compra_historico: {
        Row: {
          acao: string;
          created_at: string;
          detalhes: Json | null;
          id: string;
          ordem_compra_id: string;
          status_anterior: string | null;
          status_novo: string | null;
          usuario_id: string | null;
          usuario_nome: string | null;
        };
        Insert: {
          acao: string;
          created_at?: string;
          detalhes?: Json | null;
          id?: string;
          ordem_compra_id: string;
          status_anterior?: string | null;
          status_novo?: string | null;
          usuario_id?: string | null;
          usuario_nome?: string | null;
        };
        Update: {
          acao?: string;
          created_at?: string;
          detalhes?: Json | null;
          id?: string;
          ordem_compra_id?: string;
          status_anterior?: string | null;
          status_novo?: string | null;
          usuario_id?: string | null;
          usuario_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ordem_compra_historico_ordem_compra_id_fkey";
            columns: ["ordem_compra_id"];
            isOneToOne: false;
            referencedRelation: "ordens_compra";
            referencedColumns: ["id"];
          },
        ];
      };
      ordem_compra_itens: {
        Row: {
          codigo_compra: string | null;
          codigo_produto: string | null;
          cotacao_item_id: string | null;
          created_at: string;
          data_entrega: string | null;
          descricao: string;
          id: string;
          insumo_id: string | null;
          markup_pct: number | null;
          observacoes: string | null;
          ordem: number;
          ordem_compra_id: string;
          proposta_item_id: string | null;
          quantidade: number;
          saldo: number | null;
          unidade: string;
          valor_desconto: number;
          valor_icms_st: number;
          valor_ipi: number;
          valor_repasse_total_item: number | null;
          valor_repasse_unit: number | null;
          valor_total: number | null;
          valor_unitario: number;
        };
        Insert: {
          codigo_compra?: string | null;
          codigo_produto?: string | null;
          cotacao_item_id?: string | null;
          created_at?: string;
          data_entrega?: string | null;
          descricao: string;
          id?: string;
          insumo_id?: string | null;
          markup_pct?: number | null;
          observacoes?: string | null;
          ordem?: number;
          ordem_compra_id: string;
          proposta_item_id?: string | null;
          quantidade?: number;
          saldo?: number | null;
          unidade?: string;
          valor_desconto?: number;
          valor_icms_st?: number;
          valor_ipi?: number;
          valor_repasse_total_item?: number | null;
          valor_repasse_unit?: number | null;
          valor_total?: number | null;
          valor_unitario?: number;
        };
        Update: {
          codigo_compra?: string | null;
          codigo_produto?: string | null;
          cotacao_item_id?: string | null;
          created_at?: string;
          data_entrega?: string | null;
          descricao?: string;
          id?: string;
          insumo_id?: string | null;
          markup_pct?: number | null;
          observacoes?: string | null;
          ordem?: number;
          ordem_compra_id?: string;
          proposta_item_id?: string | null;
          quantidade?: number;
          saldo?: number | null;
          unidade?: string;
          valor_desconto?: number;
          valor_icms_st?: number;
          valor_ipi?: number;
          valor_repasse_total_item?: number | null;
          valor_repasse_unit?: number | null;
          valor_total?: number | null;
          valor_unitario?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ordem_compra_itens_cotacao_item_id_fkey";
            columns: ["cotacao_item_id"];
            isOneToOne: false;
            referencedRelation: "cotacao_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordem_compra_itens_insumo_id_fkey";
            columns: ["insumo_id"];
            isOneToOne: false;
            referencedRelation: "projeto_insumos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordem_compra_itens_ordem_compra_id_fkey";
            columns: ["ordem_compra_id"];
            isOneToOne: false;
            referencedRelation: "ordens_compra";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordem_compra_itens_proposta_item_id_fkey";
            columns: ["proposta_item_id"];
            isOneToOne: false;
            referencedRelation: "cotacao_proposta_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      ordens_compra: {
        Row: {
          aprovado_em: string | null;
          aprovado_por: string | null;
          cliente_final_cnpj: string | null;
          cliente_final_razao_social: string | null;
          cliente_id: string | null;
          comprador_cep: string | null;
          comprador_cidade: string | null;
          comprador_cnpj: string | null;
          comprador_email: string | null;
          comprador_endereco: string | null;
          comprador_ie: string | null;
          comprador_logo_url: string | null;
          comprador_razao_social: string | null;
          comprador_telefone: string | null;
          comprador_uf: string | null;
          condicao_pagamento: string | null;
          cotacao_id: string | null;
          created_at: string;
          criado_por: string | null;
          deleted_at: string | null;
          emissao_em: string;
          entrega_prevista: string | null;
          enviado_em: string | null;
          fornecedor_cep: string | null;
          fornecedor_cidade: string | null;
          fornecedor_cnpj: string | null;
          fornecedor_codigo: string | null;
          fornecedor_contato: string | null;
          fornecedor_email: string | null;
          fornecedor_endereco: string | null;
          fornecedor_id: string;
          fornecedor_ie: string | null;
          fornecedor_nome_fantasia: string | null;
          fornecedor_pais: string | null;
          fornecedor_razao_social: string | null;
          fornecedor_telefone: string | null;
          fornecedor_uf: string | null;
          id: string;
          incoterm: string | null;
          margem_bruta: number | null;
          markup_pct: number | null;
          moeda: string;
          numero: string;
          observacoes: string | null;
          observacoes_internas: string | null;
          oportunidade_id: string | null;
          projeto_id: string | null;
          status: Database["public"]["Enums"]["oc_status"];
          tipo: string;
          transportadora: string | null;
          updated_at: string;
          valor_desconto: number;
          valor_frete: number;
          valor_icms_st: number;
          valor_ipi: number;
          valor_repasse: number | null;
          valor_repasse_total: number | null;
          valor_subtotal: number;
          valor_total: number;
        };
        Insert: {
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          cliente_final_cnpj?: string | null;
          cliente_final_razao_social?: string | null;
          cliente_id?: string | null;
          comprador_cep?: string | null;
          comprador_cidade?: string | null;
          comprador_cnpj?: string | null;
          comprador_email?: string | null;
          comprador_endereco?: string | null;
          comprador_ie?: string | null;
          comprador_logo_url?: string | null;
          comprador_razao_social?: string | null;
          comprador_telefone?: string | null;
          comprador_uf?: string | null;
          condicao_pagamento?: string | null;
          cotacao_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          deleted_at?: string | null;
          emissao_em?: string;
          entrega_prevista?: string | null;
          enviado_em?: string | null;
          fornecedor_cep?: string | null;
          fornecedor_cidade?: string | null;
          fornecedor_cnpj?: string | null;
          fornecedor_codigo?: string | null;
          fornecedor_contato?: string | null;
          fornecedor_email?: string | null;
          fornecedor_endereco?: string | null;
          fornecedor_id: string;
          fornecedor_ie?: string | null;
          fornecedor_nome_fantasia?: string | null;
          fornecedor_pais?: string | null;
          fornecedor_razao_social?: string | null;
          fornecedor_telefone?: string | null;
          fornecedor_uf?: string | null;
          id?: string;
          incoterm?: string | null;
          margem_bruta?: number | null;
          markup_pct?: number | null;
          moeda?: string;
          numero?: string;
          observacoes?: string | null;
          observacoes_internas?: string | null;
          oportunidade_id?: string | null;
          projeto_id?: string | null;
          status?: Database["public"]["Enums"]["oc_status"];
          tipo?: string;
          transportadora?: string | null;
          updated_at?: string;
          valor_desconto?: number;
          valor_frete?: number;
          valor_icms_st?: number;
          valor_ipi?: number;
          valor_repasse?: number | null;
          valor_repasse_total?: number | null;
          valor_subtotal?: number;
          valor_total?: number;
        };
        Update: {
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          cliente_final_cnpj?: string | null;
          cliente_final_razao_social?: string | null;
          cliente_id?: string | null;
          comprador_cep?: string | null;
          comprador_cidade?: string | null;
          comprador_cnpj?: string | null;
          comprador_email?: string | null;
          comprador_endereco?: string | null;
          comprador_ie?: string | null;
          comprador_logo_url?: string | null;
          comprador_razao_social?: string | null;
          comprador_telefone?: string | null;
          comprador_uf?: string | null;
          condicao_pagamento?: string | null;
          cotacao_id?: string | null;
          created_at?: string;
          criado_por?: string | null;
          deleted_at?: string | null;
          emissao_em?: string;
          entrega_prevista?: string | null;
          enviado_em?: string | null;
          fornecedor_cep?: string | null;
          fornecedor_cidade?: string | null;
          fornecedor_cnpj?: string | null;
          fornecedor_codigo?: string | null;
          fornecedor_contato?: string | null;
          fornecedor_email?: string | null;
          fornecedor_endereco?: string | null;
          fornecedor_id?: string;
          fornecedor_ie?: string | null;
          fornecedor_nome_fantasia?: string | null;
          fornecedor_pais?: string | null;
          fornecedor_razao_social?: string | null;
          fornecedor_telefone?: string | null;
          fornecedor_uf?: string | null;
          id?: string;
          incoterm?: string | null;
          margem_bruta?: number | null;
          markup_pct?: number | null;
          moeda?: string;
          numero?: string;
          observacoes?: string | null;
          observacoes_internas?: string | null;
          oportunidade_id?: string | null;
          projeto_id?: string | null;
          status?: Database["public"]["Enums"]["oc_status"];
          tipo?: string;
          transportadora?: string | null;
          updated_at?: string;
          valor_desconto?: number;
          valor_frete?: number;
          valor_icms_st?: number;
          valor_ipi?: number;
          valor_repasse?: number | null;
          valor_repasse_total?: number | null;
          valor_subtotal?: number;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ordens_compra_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_compra_cotacao_id_fkey";
            columns: ["cotacao_id"];
            isOneToOne: false;
            referencedRelation: "cotacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_compra_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_compra_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_compra_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
        ];
      };
      page_seo: {
        Row: {
          canonical: string | null;
          created_at: string;
          description: string | null;
          last_scanned_at: string | null;
          noindex: boolean;
          og_description: string | null;
          og_image: string | null;
          og_title: string | null;
          route_path: string;
          title: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          canonical?: string | null;
          created_at?: string;
          description?: string | null;
          last_scanned_at?: string | null;
          noindex?: boolean;
          og_description?: string | null;
          og_image?: string | null;
          og_title?: string | null;
          route_path: string;
          title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          canonical?: string | null;
          created_at?: string;
          description?: string | null;
          last_scanned_at?: string | null;
          noindex?: boolean;
          og_description?: string | null;
          og_image?: string | null;
          og_title?: string | null;
          route_path?: string;
          title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      paises_config: {
        Row: {
          codigo: string;
          created_at: string;
          documento_mascara: string;
          documento_nome: string;
          documento_regex: string;
          idioma_padrao: string;
          moeda_padrao: string;
          nome: string;
          updated_at: string;
          usa_cep_lookup: boolean;
        };
        Insert: {
          codigo: string;
          created_at?: string;
          documento_mascara: string;
          documento_nome: string;
          documento_regex: string;
          idioma_padrao: string;
          moeda_padrao: string;
          nome: string;
          updated_at?: string;
          usa_cep_lookup?: boolean;
        };
        Update: {
          codigo?: string;
          created_at?: string;
          documento_mascara?: string;
          documento_nome?: string;
          documento_regex?: string;
          idioma_padrao?: string;
          moeda_padrao?: string;
          nome?: string;
          updated_at?: string;
          usa_cep_lookup?: boolean;
        };
        Relationships: [];
      };
      penta_bases: {
        Row: {
          active: boolean;
          columns: Json;
          enabled: boolean;
          has_companies: boolean;
          has_tariff_codes: boolean;
          id: string;
          key_country: string;
          key_operation: string;
          key_version: number;
          pais: string | null;
          parameters: Json;
          query_limit: number;
          start_date: string | null;
          synced_at: string;
          title: string;
          under_maintenance: boolean;
          updated_date: string | null;
        };
        Insert: {
          active?: boolean;
          columns?: Json;
          enabled?: boolean;
          has_companies?: boolean;
          has_tariff_codes?: boolean;
          id?: string;
          key_country: string;
          key_operation: string;
          key_version: number;
          pais?: string | null;
          parameters?: Json;
          query_limit?: number;
          start_date?: string | null;
          synced_at?: string;
          title?: string;
          under_maintenance?: boolean;
          updated_date?: string | null;
        };
        Update: {
          active?: boolean;
          columns?: Json;
          enabled?: boolean;
          has_companies?: boolean;
          has_tariff_codes?: boolean;
          id?: string;
          key_country?: string;
          key_operation?: string;
          key_version?: number;
          pais?: string | null;
          parameters?: Json;
          query_limit?: number;
          start_date?: string | null;
          synced_at?: string;
          title?: string;
          under_maintenance?: boolean;
          updated_date?: string | null;
        };
        Relationships: [];
      };
      processo_anexos: {
        Row: {
          checklist_status_id: string | null;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          drive_file_id: string;
          drive_folder_id: string | null;
          drive_view_url: string | null;
          id: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          processo_id: string;
          sugestoes_ia: Json | null;
          tamanho_bytes: number;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          checklist_status_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_file_id: string;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          id?: string;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          processo_id: string;
          sugestoes_ia?: Json | null;
          tamanho_bytes: number;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          checklist_status_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_file_id?: string;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          id?: string;
          mime_type?: string;
          nome_final?: string;
          nome_original?: string;
          processo_id?: string;
          sugestoes_ia?: Json | null;
          tamanho_bytes?: number;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "processo_anexos_checklist_status_id_fkey";
            columns: ["checklist_status_id"];
            isOneToOne: false;
            referencedRelation: "processo_checklist_status";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_anexos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_checklist_acoes: {
        Row: {
          acao: Database["public"]["Enums"]["checklist_acao"];
          anexo_id: string | null;
          comentario: string | null;
          created_at: string;
          id: string;
          processo_id: string;
          status_id: string;
          user_id: string | null;
          user_nome: string;
        };
        Insert: {
          acao: Database["public"]["Enums"]["checklist_acao"];
          anexo_id?: string | null;
          comentario?: string | null;
          created_at?: string;
          id?: string;
          processo_id: string;
          status_id: string;
          user_id?: string | null;
          user_nome: string;
        };
        Update: {
          acao?: Database["public"]["Enums"]["checklist_acao"];
          anexo_id?: string | null;
          comentario?: string | null;
          created_at?: string;
          id?: string;
          processo_id?: string;
          status_id?: string;
          user_id?: string | null;
          user_nome?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_checklist_acoes_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_checklist_acoes_status_id_fkey";
            columns: ["status_id"];
            isOneToOne: false;
            referencedRelation: "processo_checklist_status";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_checklist_status: {
        Row: {
          created_at: string;
          done: boolean;
          done_at: string | null;
          done_by: string | null;
          id: string;
          last_action_at: string | null;
          last_action_by: string | null;
          last_action_by_nome: string | null;
          last_comentario: string | null;
          observacao: string | null;
          processo_id: string;
          template_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          done?: boolean;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          last_action_at?: string | null;
          last_action_by?: string | null;
          last_action_by_nome?: string | null;
          last_comentario?: string | null;
          observacao?: string | null;
          processo_id: string;
          template_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          done?: boolean;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          last_action_at?: string | null;
          last_action_by?: string | null;
          last_action_by_nome?: string | null;
          last_comentario?: string | null;
          observacao?: string | null;
          processo_id?: string;
          template_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_checklist_status_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "processo_checklist_status_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "processo_checklist_template";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_checklist_template: {
        Row: {
          ativo: boolean;
          created_at: string;
          descricao: string | null;
          id: string;
          label: string;
          obrigatorio: boolean;
          ordem: number;
          stage: Database["public"]["Enums"]["processo_stage"];
          tipo: Database["public"]["Enums"]["processo_tipo"];
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          label: string;
          obrigatorio?: boolean;
          ordem?: number;
          stage: Database["public"]["Enums"]["processo_stage"];
          tipo: Database["public"]["Enums"]["processo_tipo"];
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          label?: string;
          obrigatorio?: boolean;
          ordem?: number;
          stage?: Database["public"]["Enums"]["processo_stage"];
          tipo?: Database["public"]["Enums"]["processo_tipo"];
          updated_at?: string;
        };
        Relationships: [];
      };
      processo_emails: {
        Row: {
          at: string;
          id: string;
          processo_id: string;
          subject: string;
          template: string;
          to_email: string;
        };
        Insert: {
          at?: string;
          id?: string;
          processo_id: string;
          subject: string;
          template: string;
          to_email: string;
        };
        Update: {
          at?: string;
          id?: string;
          processo_id?: string;
          subject?: string;
          template?: string;
          to_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_emails_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_eventos: {
        Row: {
          at: string;
          created_by: string | null;
          id: string;
          kind: Database["public"]["Enums"]["processo_evento_kind"];
          processo_id: string;
          text: string;
        };
        Insert: {
          at?: string;
          created_by?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["processo_evento_kind"];
          processo_id: string;
          text: string;
        };
        Update: {
          at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["processo_evento_kind"];
          processo_id?: string;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_eventos_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_notificacoes: {
        Row: {
          at: string;
          id: string;
          processo_id: string | null;
          read: boolean;
          text: string;
          user_id: string;
        };
        Insert: {
          at?: string;
          id?: string;
          processo_id?: string | null;
          read?: boolean;
          text: string;
          user_id: string;
        };
        Update: {
          at?: string;
          id?: string;
          processo_id?: string | null;
          read?: boolean;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_notificacoes_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_tarefas: {
        Row: {
          created_at: string;
          id: string;
          pilar_id: string;
          prazo: string;
          processo_id: string;
          status: Database["public"]["Enums"]["tarefa_status"];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          pilar_id: string;
          prazo: string;
          processo_id: string;
          status?: Database["public"]["Enums"]["tarefa_status"];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          pilar_id?: string;
          prazo?: string;
          processo_id?: string;
          status?: Database["public"]["Enums"]["tarefa_status"];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_tarefas_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_template_checklist_itens: {
        Row: {
          created_at: string;
          descricao: string | null;
          id: string;
          obrigatorio: boolean;
          ordem: number;
          requer_arquivo: boolean;
          secao: string;
          template_id: string;
          tipos_arquivo_aceitos: string[];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          obrigatorio?: boolean;
          ordem?: number;
          requer_arquivo?: boolean;
          secao?: string;
          template_id: string;
          tipos_arquivo_aceitos?: string[];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          obrigatorio?: boolean;
          ordem?: number;
          requer_arquivo?: boolean;
          secao?: string;
          template_id?: string;
          tipos_arquivo_aceitos?: string[];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_template_checklist_itens_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "processo_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_template_eventos: {
        Row: {
          created_at: string;
          dias_apos_inicio: number;
          id: string;
          ordem: number;
          template_id: string;
          tipo: Database["public"]["Enums"]["template_evento_tipo"];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dias_apos_inicio?: number;
          id?: string;
          ordem?: number;
          template_id: string;
          tipo?: Database["public"]["Enums"]["template_evento_tipo"];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dias_apos_inicio?: number;
          id?: string;
          ordem?: number;
          template_id?: string;
          tipo?: Database["public"]["Enums"]["template_evento_tipo"];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_template_eventos_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "processo_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_template_tarefas: {
        Row: {
          created_at: string;
          descricao: string | null;
          dias_apos_inicio: number;
          id: string;
          ordem: number;
          responsavel_role: Database["public"]["Enums"]["app_role"] | null;
          template_id: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          dias_apos_inicio?: number;
          id?: string;
          ordem?: number;
          responsavel_role?: Database["public"]["Enums"]["app_role"] | null;
          template_id: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          dias_apos_inicio?: number;
          id?: string;
          ordem?: number;
          responsavel_role?: Database["public"]["Enums"]["app_role"] | null;
          template_id?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processo_template_tarefas_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "processo_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_template_versoes: {
        Row: {
          created_at: string;
          created_by: string | null;
          created_by_nome: string | null;
          id: string;
          motivo: string | null;
          snapshot: Json;
          template_id: string;
          versao: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          created_by_nome?: string | null;
          id?: string;
          motivo?: string | null;
          snapshot: Json;
          template_id: string;
          versao: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          created_by_nome?: string | null;
          id?: string;
          motivo?: string | null;
          snapshot?: Json;
          template_id?: string;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "processo_template_versoes_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "processo_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      processo_templates: {
        Row: {
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          descricao: string | null;
          id: string;
          nome: string;
          rfq_tipo_id: string | null;
          tipo: Database["public"]["Enums"]["processo_tipo"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          id?: string;
          nome: string;
          rfq_tipo_id?: string | null;
          tipo: Database["public"]["Enums"]["processo_tipo"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          id?: string;
          nome?: string;
          rfq_tipo_id?: string | null;
          tipo?: Database["public"]["Enums"]["processo_tipo"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "processo_templates_rfq_tipo_id_fkey";
            columns: ["rfq_tipo_id"];
            isOneToOne: false;
            referencedRelation: "rfq_formulario_tipo";
            referencedColumns: ["id"];
          },
        ];
      };
      processos: {
        Row: {
          cliente_id: string;
          codigo: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          lost_at: string | null;
          lost_by: string | null;
          lost_category: Database["public"]["Enums"]["lost_category"] | null;
          lost_count: number;
          lost_reason: string | null;
          pilar_id: string;
          previsao: string | null;
          progresso: number;
          restored_at: string | null;
          restored_by: string | null;
          risco: Database["public"]["Enums"]["processo_risco"];
          stage: Database["public"]["Enums"]["processo_stage"];
          stage_entered_at: string;
          tipo: Database["public"]["Enums"]["processo_tipo"];
          titulo: string;
          updated_at: string;
          updated_by: string | null;
          valor: number | null;
        };
        Insert: {
          cliente_id: string;
          codigo: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          lost_at?: string | null;
          lost_by?: string | null;
          lost_category?: Database["public"]["Enums"]["lost_category"] | null;
          lost_count?: number;
          lost_reason?: string | null;
          pilar_id: string;
          previsao?: string | null;
          progresso?: number;
          restored_at?: string | null;
          restored_by?: string | null;
          risco?: Database["public"]["Enums"]["processo_risco"];
          stage?: Database["public"]["Enums"]["processo_stage"];
          stage_entered_at?: string;
          tipo?: Database["public"]["Enums"]["processo_tipo"];
          titulo: string;
          updated_at?: string;
          updated_by?: string | null;
          valor?: number | null;
        };
        Update: {
          cliente_id?: string;
          codigo?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          lost_at?: string | null;
          lost_by?: string | null;
          lost_category?: Database["public"]["Enums"]["lost_category"] | null;
          lost_count?: number;
          lost_reason?: string | null;
          pilar_id?: string;
          previsao?: string | null;
          progresso?: number;
          restored_at?: string | null;
          restored_by?: string | null;
          risco?: Database["public"]["Enums"]["processo_risco"];
          stage?: Database["public"]["Enums"]["processo_stage"];
          stage_entered_at?: string;
          tipo?: Database["public"]["Enums"]["processo_tipo"];
          titulo?: string;
          updated_at?: string;
          updated_by?: string | null;
          valor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "processos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          agenda_convidados_padrao: string | null;
          agenda_duracao_min: number;
          agenda_fuso: string;
          agenda_google_email: string | null;
          agenda_provider: string;
          agenda_sala_padrao: string | null;
          agenda_teams_email: string | null;
          agenda_teams_tenant: string | null;
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          disabled: boolean;
          disabled_at: string | null;
          disabled_by: string | null;
          disabled_reason: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          language: string;
          must_change_password: boolean;
          updated_at: string;
        };
        Insert: {
          agenda_convidados_padrao?: string | null;
          agenda_duracao_min?: number;
          agenda_fuso?: string;
          agenda_google_email?: string | null;
          agenda_provider?: string;
          agenda_sala_padrao?: string | null;
          agenda_teams_email?: string | null;
          agenda_teams_tenant?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          disabled?: boolean;
          disabled_at?: string | null;
          disabled_by?: string | null;
          disabled_reason?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          language?: string;
          must_change_password?: boolean;
          updated_at?: string;
        };
        Update: {
          agenda_convidados_padrao?: string | null;
          agenda_duracao_min?: number;
          agenda_fuso?: string;
          agenda_google_email?: string | null;
          agenda_provider?: string;
          agenda_sala_padrao?: string | null;
          agenda_teams_email?: string | null;
          agenda_teams_tenant?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          disabled?: boolean;
          disabled_at?: string | null;
          disabled_by?: string | null;
          disabled_reason?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          language?: string;
          must_change_password?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      projeto_insumo_historico: {
        Row: {
          arquivo_nome: string | null;
          created_at: string;
          descricao: string;
          diff: Json;
          id: string;
          projeto_id: string;
          tipo: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          arquivo_nome?: string | null;
          created_at?: string;
          descricao: string;
          diff?: Json;
          id?: string;
          projeto_id: string;
          tipo: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          arquivo_nome?: string | null;
          created_at?: string;
          descricao?: string;
          diff?: Json;
          id?: string;
          projeto_id?: string;
          tipo?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projeto_insumo_historico_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
        ];
      };
      projeto_insumos: {
        Row: {
          almox_fator_conversao: number | null;
          almox_item_id: string | null;
          aprovado_em: string | null;
          aprovado_por: string | null;
          categoria_slug: string | null;
          cliente_id: string | null;
          codigo_interno: string | null;
          created_at: string;
          created_by: string | null;
          criticidade: Database["public"]["Enums"]["insumo_criticidade"];
          custo_estimado_unit: number | null;
          custo_real_unit: number | null;
          deleted_at: string | null;
          descricao: string;
          disciplina: string;
          equipamento_disciplina: string | null;
          equipamento_id: string | null;
          especificacao_tecnica: string | null;
          fabricante_sugerido: string | null;
          fornecedor_sugerido_id: string | null;
          id: string;
          lead_time_desejado_dias: number | null;
          necessidade_em: string | null;
          observacoes: string | null;
          oportunidade_id: string | null;
          part_number: string | null;
          projeto_id: string;
          qtd_estoque: number;
          quantidade: number;
          quantidade_reserva: number;
          solicitado_por: string | null;
          status: Database["public"]["Enums"]["insumo_status"];
          sub_conjunto: string | null;
          unidade: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          almox_fator_conversao?: number | null;
          almox_item_id?: string | null;
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          categoria_slug?: string | null;
          cliente_id?: string | null;
          codigo_interno?: string | null;
          created_at?: string;
          created_by?: string | null;
          criticidade?: Database["public"]["Enums"]["insumo_criticidade"];
          custo_estimado_unit?: number | null;
          custo_real_unit?: number | null;
          deleted_at?: string | null;
          descricao: string;
          disciplina: string;
          equipamento_disciplina?: string | null;
          equipamento_id?: string | null;
          especificacao_tecnica?: string | null;
          fabricante_sugerido?: string | null;
          fornecedor_sugerido_id?: string | null;
          id?: string;
          lead_time_desejado_dias?: number | null;
          necessidade_em?: string | null;
          observacoes?: string | null;
          oportunidade_id?: string | null;
          part_number?: string | null;
          projeto_id: string;
          qtd_estoque?: number;
          quantidade?: number;
          quantidade_reserva?: number;
          solicitado_por?: string | null;
          status?: Database["public"]["Enums"]["insumo_status"];
          sub_conjunto?: string | null;
          unidade?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          almox_fator_conversao?: number | null;
          almox_item_id?: string | null;
          aprovado_em?: string | null;
          aprovado_por?: string | null;
          categoria_slug?: string | null;
          cliente_id?: string | null;
          codigo_interno?: string | null;
          created_at?: string;
          created_by?: string | null;
          criticidade?: Database["public"]["Enums"]["insumo_criticidade"];
          custo_estimado_unit?: number | null;
          custo_real_unit?: number | null;
          deleted_at?: string | null;
          descricao?: string;
          disciplina?: string;
          equipamento_disciplina?: string | null;
          equipamento_id?: string | null;
          especificacao_tecnica?: string | null;
          fabricante_sugerido?: string | null;
          fornecedor_sugerido_id?: string | null;
          id?: string;
          lead_time_desejado_dias?: number | null;
          necessidade_em?: string | null;
          observacoes?: string | null;
          oportunidade_id?: string | null;
          part_number?: string | null;
          projeto_id?: string;
          qtd_estoque?: number;
          quantidade?: number;
          quantidade_reserva?: number;
          solicitado_por?: string | null;
          status?: Database["public"]["Enums"]["insumo_status"];
          sub_conjunto?: string | null;
          unidade?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projeto_insumos_almox_item_id_fkey";
            columns: ["almox_item_id"];
            isOneToOne: false;
            referencedRelation: "almox_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_insumos_almox_item_id_fkey";
            columns: ["almox_item_id"];
            isOneToOne: false;
            referencedRelation: "almox_saldo_item";
            referencedColumns: ["item_id"];
          },
          {
            foreignKeyName: "projeto_insumos_categoria_slug_fkey";
            columns: ["categoria_slug"];
            isOneToOne: false;
            referencedRelation: "fornecedor_categorias_catalog";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "projeto_insumos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_insumos_equipamento_id_fkey";
            columns: ["equipamento_id"];
            isOneToOne: false;
            referencedRelation: "cliente_equipamentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_insumos_fornecedor_sugerido_id_fkey";
            columns: ["fornecedor_sugerido_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_insumos_oportunidade_id_fkey";
            columns: ["oportunidade_id"];
            isOneToOne: false;
            referencedRelation: "oportunidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_insumos_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "equipamento_projetos";
            referencedColumns: ["id"];
          },
        ];
      };
      relatorio_share_links: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          last_used_at: string | null;
          relatorio_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          rotulo: string | null;
          scope: string[];
          tipo: string;
          token_hash: string;
          use_count: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at: string;
          id: string;
          last_used_at?: string | null;
          relatorio_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          rotulo?: string | null;
          scope?: string[];
          tipo: string;
          token_hash: string;
          use_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          last_used_at?: string | null;
          relatorio_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          rotulo?: string | null;
          scope?: string[];
          tipo?: string;
          token_hash?: string;
          use_count?: number;
        };
        Relationships: [];
      };
      relatorio_share_submissoes: {
        Row: {
          acao: string;
          alvo_id: string | null;
          created_at: string;
          id: string;
          ip: string | null;
          payload: Json | null;
          relatorio_id: string;
          share_link_id: string;
          signatario_cargo: string | null;
          signatario_nome: string | null;
          status: string;
          tipo: string;
          user_agent: string | null;
        };
        Insert: {
          acao: string;
          alvo_id?: string | null;
          created_at?: string;
          id?: string;
          ip?: string | null;
          payload?: Json | null;
          relatorio_id: string;
          share_link_id: string;
          signatario_cargo?: string | null;
          signatario_nome?: string | null;
          status?: string;
          tipo: string;
          user_agent?: string | null;
        };
        Update: {
          acao?: string;
          alvo_id?: string | null;
          created_at?: string;
          id?: string;
          ip?: string | null;
          payload?: Json | null;
          relatorio_id?: string;
          share_link_id?: string;
          signatario_cargo?: string | null;
          signatario_nome?: string | null;
          status?: string;
          tipo?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "relatorio_share_submissoes_share_link_id_fkey";
            columns: ["share_link_id"];
            isOneToOne: false;
            referencedRelation: "relatorio_share_links";
            referencedColumns: ["id"];
          },
        ];
      };
      rfq_formulario_link: {
        Row: {
          cliente_id: string;
          criado_em: string;
          expira_em: string | null;
          id: string;
          idioma: string;
          observacoes: string | null;
          preenchido_em: string | null;
          sales_id: string;
          slug: string;
          status: string;
          submissao_id: string | null;
          tipo_id: string;
          titulo: string | null;
        };
        Insert: {
          cliente_id: string;
          criado_em?: string;
          expira_em?: string | null;
          id?: string;
          idioma: string;
          observacoes?: string | null;
          preenchido_em?: string | null;
          sales_id: string;
          slug: string;
          status?: string;
          submissao_id?: string | null;
          tipo_id: string;
          titulo?: string | null;
        };
        Update: {
          cliente_id?: string;
          criado_em?: string;
          expira_em?: string | null;
          id?: string;
          idioma?: string;
          observacoes?: string | null;
          preenchido_em?: string | null;
          sales_id?: string;
          slug?: string;
          status?: string;
          submissao_id?: string | null;
          tipo_id?: string;
          titulo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rfq_formulario_link_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfq_formulario_link_tipo_id_fkey";
            columns: ["tipo_id"];
            isOneToOne: false;
            referencedRelation: "rfq_formulario_tipo";
            referencedColumns: ["id"];
          },
        ];
      };
      rfq_formulario_tipo: {
        Row: {
          ativo: boolean;
          campos_schema: Json;
          codigo: string;
          codigo_formulario: string | null;
          created_at: string;
          descricao: string | null;
          familia: string | null;
          id: string;
          nome_en: string | null;
          nome_es: string | null;
          nome_pt: string;
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          campos_schema?: Json;
          codigo: string;
          codigo_formulario?: string | null;
          created_at?: string;
          descricao?: string | null;
          familia?: string | null;
          id?: string;
          nome_en?: string | null;
          nome_es?: string | null;
          nome_pt: string;
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          campos_schema?: Json;
          codigo?: string;
          codigo_formulario?: string | null;
          created_at?: string;
          descricao?: string | null;
          familia?: string | null;
          id?: string;
          nome_en?: string | null;
          nome_es?: string | null;
          nome_pt?: string;
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rfq_submissao: {
        Row: {
          cliente_id: string;
          criado_em: string;
          id: string;
          idioma: string;
          ip: unknown;
          lida_em: string | null;
          lida_por: string | null;
          link_id: string;
          observacoes_internas: string | null;
          oportunidade_id: string | null;
          preenchido_por_email: string | null;
          preenchido_por_nome: string | null;
          preenchido_por_telefone: string | null;
          processo_id: string | null;
          respostas: Json;
          tipo_id: string;
          user_agent: string | null;
        };
        Insert: {
          cliente_id: string;
          criado_em?: string;
          id?: string;
          idioma: string;
          ip?: unknown;
          lida_em?: string | null;
          lida_por?: string | null;
          link_id: string;
          observacoes_internas?: string | null;
          oportunidade_id?: string | null;
          preenchido_por_email?: string | null;
          preenchido_por_nome?: string | null;
          preenchido_por_telefone?: string | null;
          processo_id?: string | null;
          respostas?: Json;
          tipo_id: string;
          user_agent?: string | null;
        };
        Update: {
          cliente_id?: string;
          criado_em?: string;
          id?: string;
          idioma?: string;
          ip?: unknown;
          lida_em?: string | null;
          lida_por?: string | null;
          link_id?: string;
          observacoes_internas?: string | null;
          oportunidade_id?: string | null;
          preenchido_por_email?: string | null;
          preenchido_por_nome?: string | null;
          preenchido_por_telefone?: string | null;
          processo_id?: string | null;
          respostas?: Json;
          tipo_id?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rfq_submissao_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfq_submissao_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: false;
            referencedRelation: "rfq_formulario_link";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rfq_submissao_tipo_id_fkey";
            columns: ["tipo_id"];
            isOneToOne: false;
            referencedRelation: "rfq_formulario_tipo";
            referencedColumns: ["id"];
          },
        ];
      };
      rfq_submissao_anexo: {
        Row: {
          campo_id: string | null;
          criado_em: string;
          drive_file_id: string | null;
          drive_folder_id: string | null;
          drive_view_url: string | null;
          id: string;
          mime: string | null;
          nome: string;
          nome_original: string | null;
          storage_bucket: string | null;
          storage_path: string | null;
          submissao_id: string;
          tamanho_bytes: number | null;
        };
        Insert: {
          campo_id?: string | null;
          criado_em?: string;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          id?: string;
          mime?: string | null;
          nome: string;
          nome_original?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          submissao_id: string;
          tamanho_bytes?: number | null;
        };
        Update: {
          campo_id?: string | null;
          criado_em?: string;
          drive_file_id?: string | null;
          drive_folder_id?: string | null;
          drive_view_url?: string | null;
          id?: string;
          mime?: string | null;
          nome?: string;
          nome_original?: string | null;
          storage_bucket?: string | null;
          storage_path?: string | null;
          submissao_id?: string;
          tamanho_bytes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "rfq_submissao_anexo_submissao_id_fkey";
            columns: ["submissao_id"];
            isOneToOne: false;
            referencedRelation: "rfq_submissao";
            referencedColumns: ["id"];
          },
        ];
      };
      role_module_permissions: {
        Row: {
          enabled: boolean;
          id: string;
          module: Database["public"]["Enums"]["app_module"];
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          enabled?: boolean;
          id?: string;
          module: Database["public"]["Enums"]["app_module"];
          role: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          id?: string;
          module?: Database["public"]["Enums"]["app_module"];
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      sat_relatorio: {
        Row: {
          assinatura_cliente: Json | null;
          assinatura_tecnico: Json | null;
          cliente_id: string | null;
          codigo: string;
          created_at: string;
          created_by: string | null;
          dados: Json;
          deleted_at: string | null;
          deleted_by: string | null;
          drive_folder_id: string | null;
          equipamento_ids: string[];
          id: string;
          local_endereco: string | null;
          motivos_viagem: string[];
          observacoes: string | null;
          pdf_drive_file_id: string | null;
          pdf_drive_view_url: string | null;
          pdf_gerado_em: string | null;
          pdf_status: string | null;
          periodo_ate: string | null;
          periodo_de: string | null;
          processo_id: string | null;
          status: Database["public"]["Enums"]["sat_relatorio_status"];
          tecnico_ids: string[];
          tecnicos: Json;
          template_id: string;
          template_versao: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          assinatura_cliente?: Json | null;
          assinatura_tecnico?: Json | null;
          cliente_id?: string | null;
          codigo: string;
          created_at?: string;
          created_by?: string | null;
          dados?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_folder_id?: string | null;
          equipamento_ids?: string[];
          id?: string;
          local_endereco?: string | null;
          motivos_viagem?: string[];
          observacoes?: string | null;
          pdf_drive_file_id?: string | null;
          pdf_drive_view_url?: string | null;
          pdf_gerado_em?: string | null;
          pdf_status?: string | null;
          periodo_ate?: string | null;
          periodo_de?: string | null;
          processo_id?: string | null;
          status?: Database["public"]["Enums"]["sat_relatorio_status"];
          tecnico_ids?: string[];
          tecnicos?: Json;
          template_id: string;
          template_versao: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assinatura_cliente?: Json | null;
          assinatura_tecnico?: Json | null;
          cliente_id?: string | null;
          codigo?: string;
          created_at?: string;
          created_by?: string | null;
          dados?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          drive_folder_id?: string | null;
          equipamento_ids?: string[];
          id?: string;
          local_endereco?: string | null;
          motivos_viagem?: string[];
          observacoes?: string | null;
          pdf_drive_file_id?: string | null;
          pdf_drive_view_url?: string | null;
          pdf_gerado_em?: string | null;
          pdf_status?: string | null;
          periodo_ate?: string | null;
          periodo_de?: string | null;
          processo_id?: string | null;
          status?: Database["public"]["Enums"]["sat_relatorio_status"];
          tecnico_ids?: string[];
          tecnicos?: Json;
          template_id?: string;
          template_versao?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sat_relatorio_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sat_relatorio_processo_id_fkey";
            columns: ["processo_id"];
            isOneToOne: false;
            referencedRelation: "processos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sat_relatorio_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "sat_template";
            referencedColumns: ["id"];
          },
        ];
      };
      sat_relatorio_anexo: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao: string | null;
          drive_file_id: string;
          drive_folder_id: string | null;
          drive_view_url: string;
          id: string;
          item_id: string | null;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          relatorio_id: string;
          secao_id: string | null;
          tamanho_bytes: number;
          tipo_anexo: string;
          updated_at: string;
          user_id: string | null;
          user_nome: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          drive_file_id: string;
          drive_folder_id?: string | null;
          drive_view_url: string;
          id?: string;
          item_id?: string | null;
          mime_type: string;
          nome_final: string;
          nome_original: string;
          relatorio_id: string;
          secao_id?: string | null;
          tamanho_bytes: number;
          tipo_anexo?: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          drive_file_id?: string;
          drive_folder_id?: string | null;
          drive_view_url?: string;
          id?: string;
          item_id?: string | null;
          mime_type?: string;
          nome_final?: string;
          nome_original?: string;
          relatorio_id?: string;
          secao_id?: string | null;
          tamanho_bytes?: number;
          tipo_anexo?: string;
          updated_at?: string;
          user_id?: string | null;
          user_nome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sat_relatorio_anexo_relatorio_id_fkey";
            columns: ["relatorio_id"];
            isOneToOne: false;
            referencedRelation: "sat_relatorio";
            referencedColumns: ["id"];
          },
        ];
      };
      sat_template: {
        Row: {
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          descricao: string | null;
          id: string;
          nome: string;
          updated_at: string;
          updated_by: string | null;
          versao: number;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          id?: string;
          nome: string;
          updated_at?: string;
          updated_by?: string | null;
          versao: number;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          descricao?: string | null;
          id?: string;
          nome?: string;
          updated_at?: string;
          updated_by?: string | null;
          versao?: number;
        };
        Relationships: [];
      };
      sat_template_item: {
        Row: {
          ajuda: string | null;
          created_at: string;
          id: string;
          label: string;
          obrigatorio: boolean;
          opcoes: Json;
          ordem: number;
          permite_anexo: boolean;
          secao_id: string;
          tipo: Database["public"]["Enums"]["sat_item_tipo"];
          updated_at: string;
        };
        Insert: {
          ajuda?: string | null;
          created_at?: string;
          id?: string;
          label: string;
          obrigatorio?: boolean;
          opcoes?: Json;
          ordem?: number;
          permite_anexo?: boolean;
          secao_id: string;
          tipo?: Database["public"]["Enums"]["sat_item_tipo"];
          updated_at?: string;
        };
        Update: {
          ajuda?: string | null;
          created_at?: string;
          id?: string;
          label?: string;
          obrigatorio?: boolean;
          opcoes?: Json;
          ordem?: number;
          permite_anexo?: boolean;
          secao_id?: string;
          tipo?: Database["public"]["Enums"]["sat_item_tipo"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sat_template_item_secao_id_fkey";
            columns: ["secao_id"];
            isOneToOne: false;
            referencedRelation: "sat_template_secao";
            referencedColumns: ["id"];
          },
        ];
      };
      sat_template_secao: {
        Row: {
          created_at: string;
          descricao: string | null;
          id: string;
          ordem: number;
          template_id: string;
          titulo: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          template_id: string;
          titulo: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          ordem?: number;
          template_id?: string;
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sat_template_secao_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "sat_template";
            referencedColumns: ["id"];
          },
        ];
      };
      segmentos: {
        Row: {
          ativo: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          nome: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          nome: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          ativo?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          nome?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      almox_recebimento_oc: {
        Row: {
          ordem_compra_id: string | null;
          quantidade_pedida: number | null;
          quantidade_pendente: number | null;
          quantidade_recebida: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ordem_compra_itens_ordem_compra_id_fkey";
            columns: ["ordem_compra_id"];
            isOneToOne: false;
            referencedRelation: "ordens_compra";
            referencedColumns: ["id"];
          },
        ];
      };
      almox_recebimento_oc_item: {
        Row: {
          ordem_compra_id: string | null;
          ordem_compra_item_id: string | null;
          quantidade_pedida: number | null;
          quantidade_pendente: number | null;
          quantidade_recebida: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ordem_compra_itens_ordem_compra_id_fkey";
            columns: ["ordem_compra_id"];
            isOneToOne: false;
            referencedRelation: "ordens_compra";
            referencedColumns: ["id"];
          },
        ];
      };
      almox_saldo_item: {
        Row: {
          abaixo_minimo: boolean | null;
          ativo: boolean | null;
          codigo: string | null;
          custo_medio: number | null;
          descricao: string | null;
          disponivel: number | null;
          estoque_minimo: number | null;
          item_id: string | null;
          reservado: number | null;
          total: number | null;
          unidade_estoque: string | null;
          valor_total: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "almox_itens_unidade_estoque_fkey";
            columns: ["unidade_estoque"];
            isOneToOne: false;
            referencedRelation: "almox_unidades";
            referencedColumns: ["codigo"];
          },
        ];
      };
      almox_saldo_item_local: {
        Row: {
          item_id: string | null;
          local_id: string | null;
          saldo: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "almox_movimentos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_itens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "almox_movimentos_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "almox_saldo_item";
            referencedColumns: ["item_id"];
          },
          {
            foreignKeyName: "almox_movimentos_local_id_fkey";
            columns: ["local_id"];
            isOneToOne: false;
            referencedRelation: "almox_locais";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      _codigo_prefixo_disciplina: { Args: { _disc: string }; Returns: string };
      admin_finalize_new_user: {
        Args: {
          _email: string;
          _full_name: string;
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: undefined;
      };
      admin_set_user_password: {
        Args: { _password: string; _user_id: string };
        Returns: undefined;
      };
      almox_cancelar_reserva: {
        Args: { _motivo?: string; _reserva_id: string };
        Returns: undefined;
      };
      almox_lock_classid: { Args: never; Returns: number };
      almox_norm: { Args: { _t: string }; Returns: string };
      almox_reservar: {
        Args: {
          _expira_em?: string;
          _item_id: string;
          _observacao?: string;
          _projeto_id: string;
          _quantidade: number;
        };
        Returns: string;
      };
      audit_actor: { Args: never; Returns: string };
      can_access_cliente: { Args: { _cliente_id: string }; Returns: boolean };
      can_access_module: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"];
          _user: string;
        };
        Returns: boolean;
      };
      can_access_oportunidade: { Args: { _op_id: string }; Returns: boolean };
      can_access_processo: { Args: { _processo_id: string }; Returns: boolean };
      can_access_sat_relatorio: { Args: { _id: string }; Returns: boolean };
      can_manage_etapa_template: { Args: never; Returns: boolean };
      chamados_gerar_alertas: {
        Args: never;
        Returns: {
          estagnados_alertados: number;
          sla_alertados: number;
        }[];
      };
      clear_must_change_password: { Args: never; Returns: undefined };
      count_active_admins: { Args: never; Returns: number };
      criar_ciclo_engenharia: {
        Args: {
          _briefing?: Json;
          _equipamento_id: string;
          _oportunidade_id?: string;
          _processo_id?: string;
          _responsavel_elet?: string;
          _responsavel_mec?: string;
        };
        Returns: string;
      };
      derive_lifecycle: {
        Args: { _stage: Database["public"]["Enums"]["pipeline_stage"] };
        Returns: Database["public"]["Enums"]["lifecycle_stage"];
      };
      gen_oc_numero: { Args: never; Returns: string };
      gerar_codigo_cotacao: { Args: never; Returns: string };
      get_public_entrevista: { Args: { _codigo: string }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      import_etapas_do_template: {
        Args: { _eq_id: string; _tipo_slug?: string };
        Returns: {
          bom_criados: number;
          etapas_criadas: number;
          template_usado: string;
        }[];
      };
      is_user_active: { Args: { _user_id: string }; Returns: boolean };
      max_role_rank: { Args: { _user_id: string }; Returns: number };
      mineracao_config_admin: { Args: never; Returns: Json };
      mineracao_consumir_consultas: {
        Args: { _chamadas?: number };
        Returns: {
          limite: number;
          usadas: number;
        }[];
      };
      mineracao_creds: {
        Args: never;
        Returns: {
          api_base_url: string;
          delay_ms: number;
          senha: string;
          usuario: string;
        }[];
      };
      mineracao_restricoes_get: {
        Args: never;
        Returns: {
          atualizado_em: string;
          snapshot: Json;
        }[];
      };
      mineracao_restricoes_set: { Args: { _snapshot: Json }; Returns: string };
      notify_admins_managers_form: {
        Args: {
          p_link: string;
          p_mensagem: string;
          p_origem: string;
          p_origem_id: string;
          p_titulo: string;
        };
        Returns: undefined;
      };
      oc_recalc_repasse: { Args: { oc_id: string }; Returns: undefined };
      oc_recalc_totais: { Args: { oc_id: string }; Returns: undefined };
      pode_ver_cliente: {
        Args: { _cliente: string; _uid: string };
        Returns: boolean;
      };
      provisionar_pagina_equipamento: {
        Args: { _tipo_id: string };
        Returns: string;
      };
      refresh_cliente_metrics: {
        Args: { _cliente_id: string };
        Returns: undefined;
      };
      role_rank: {
        Args: { _role: Database["public"]["Enums"]["app_role"] };
        Returns: number;
      };
      seed_demo_data: { Args: never; Returns: Json };
      seed_equipamento_disciplinas: {
        Args: { _eq_id: string };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      submit_public_entrevista: {
        Args: {
          _codigo: string;
          _contato?: Json;
          _idioma?: string;
          _respostas?: Json;
        };
        Returns: Json;
      };
      unaccent: { Args: { "": string }; Returns: string };
      user_pode_compras: { Args: { uid: string }; Returns: boolean };
    };
    Enums: {
      app_module:
        | "dashboard"
        | "processos"
        | "clientes"
        | "comercial"
        | "engenharia"
        | "producao"
        | "qualidade"
        | "logistica"
        | "pos_vendas"
        | "know_how"
        | "admin"
        | "changelog"
        | "fornecedores"
        | "compras";
      app_role:
        | "admin"
        | "manager"
        | "engineer"
        | "production"
        | "purchasing"
        | "assembly"
        | "field"
        | "sales";
      audit_action: "INSERT" | "UPDATE" | "DELETE" | "ACCESS";
      chamado_autor_tipo: "visitante" | "atendente" | "sistema";
      chamado_evento_tipo:
        | "criado"
        | "mensagem"
        | "status_change"
        | "assumido"
        | "vinculado_equipamento"
        | "resolvido"
        | "reaberto"
        | "notificacao_pendente"
        | "arquivado"
        | "prioridade_change"
        | "atendente_change"
        | "sla_estourado"
        | "estagnado"
        | "comentario_interno";
      chamado_origem: "site_publico" | "interno" | "contato_site";
      chamado_prioridade: "baixa" | "media" | "alta" | "critica";
      chamado_status:
        | "aberto"
        | "em_analise"
        | "aguardando_cliente"
        | "resolvido"
        | "reaberto"
        | "arquivado";
      checklist_acao:
        | "marcou_ok"
        | "marcou_nok"
        | "marcou_na"
        | "desmarcou"
        | "comentou"
        | "anexou"
        | "removeu_anexo";
      cliente_lifecycle: "suspect" | "prospect" | "cliente" | "inativo";
      cotacao_convite_status: "pendente" | "visualizado" | "respondido" | "recusado";
      cotacao_status:
        | "rascunho"
        | "aberta"
        | "respondida"
        | "escolhida"
        | "encerrada"
        | "cancelada";
      documento_aprovacao_acao:
        | "submeter"
        | "aprovar"
        | "rejeitar"
        | "publicar"
        | "arquivar"
        | "reabrir";
      documento_idioma: "pt" | "es" | "en";
      documento_moeda: "USD" | "BRL" | "EUR" | "PYG";
      documento_status:
        | "rascunho"
        | "emitido"
        | "arquivado"
        | "em_revisao"
        | "aprovado"
        | "publicado";
      equipamento_categoria:
        | "envase"
        | "rotulagem"
        | "embalagem_secundaria"
        | "paletizacao"
        | "transporte"
        | "automacao"
        | "outro";
      equipamento_doc_categoria:
        | "etp"
        | "manual_mecanico"
        | "manual_eletrico"
        | "ficha_tecnica"
        | "fat"
        | "montagem"
        | "desenho"
        | "lista_pecas"
        | "certificado"
        | "outro"
        | "esquema_eletrico";
      equipamento_status:
        | "planejamento"
        | "em_fabricacao"
        | "em_qualidade"
        | "pronto_entrega"
        | "em_transporte"
        | "em_instalacao"
        | "operacional"
        | "manutencao"
        | "parado"
        | "descomissionado";
      etapa_fase: "engenharia" | "compras" | "fabricacao" | "montagem" | "qualidade" | "expedicao";
      etapa_status: "pendente" | "em_andamento" | "concluida" | "atrasada" | "bloqueada";
      etp_historico_tipo: "alteracao" | "nota" | "aprovacao" | "status" | "anexo" | "reabertura";
      etp_status: "rascunho" | "em_revisao" | "aprovado" | "obsoleto" | "rejeitado";
      fat_assinatura_tipo: "inspetor" | "testemunha";
      fat_item_status: "pendente" | "ok" | "nok" | "na";
      fat_item_tipo:
        | "ok_nok_na"
        | "sim_nao_comentario"
        | "texto"
        | "numero"
        | "data"
        | "checkbox_multi"
        | "parametro_operacional"
        | "cabecalho";
      fat_rnc_status: "aberta" | "em_tratativa" | "fechada" | "cancelada";
      fat_status:
        | "rascunho"
        | "em_execucao"
        | "aguardando_homologacao"
        | "homologado"
        | "reprovado";
      fornecedor_ranking: "A" | "B" | "C";
      fornecedor_status: "ativo" | "em_avaliacao" | "inativo" | "bloqueado";
      insumo_criticidade: "baixa" | "media" | "alta" | "critica";
      insumo_rfq_canal: "email" | "whatsapp" | "wechat" | "telefone" | "portal" | "outro";
      insumo_rfq_status: "enviado" | "respondido" | "nao_respondeu" | "descartado";
      insumo_status:
        | "rascunho"
        | "pronto_aprovacao"
        | "aprovado"
        | "em_cotacao"
        | "cotado"
        | "em_compra"
        | "recebido"
        | "cancelado";
      kh_item_status: "rascunho" | "em_revisao" | "publicado" | "arquivado";
      kh_item_tipo: "artigo" | "video" | "pdf" | "checklist";
      lifecycle_stage: "suspect" | "prospect" | "cliente";
      logistica_embarque_status: "rascunho" | "programado" | "embarcado" | "entregue" | "cancelado";
      lost_category:
        | "preco"
        | "prazo"
        | "concorrente"
        | "escopo"
        | "cliente_desistiu"
        | "tecnico"
        | "outro";
      montagem_status: "nao_iniciada" | "em_andamento" | "concluida" | "bloqueada";
      oc_status:
        | "rascunho"
        | "aguardando_aprovacao"
        | "aprovada"
        | "enviada"
        | "recebida_parcial"
        | "recebida"
        | "cancelada";
      pipeline_stage: "novo" | "qualificado" | "proposta" | "negociacao" | "ganho" | "perdido";
      processo_evento_kind: "created" | "stage_change" | "task_created" | "email_sent" | "note";
      processo_risco: "Baixo" | "Médio" | "Alto";
      processo_stage:
        | "Lead"
        | "ETP"
        | "Orçamento"
        | "OC"
        | "Eng. Mecânica"
        | "Eng. Elétrica"
        | "Montagem"
        | "FAT"
        | "Embarque"
        | "Pós-venda"
        | "Solicitação"
        | "Análise"
        | "Registro"
        | "Resolução"
        | "Encerrado"
        | "Preparação"
        | "Agendamento"
        | "Arranque"
        | "Treinamento"
        | "Entrega Técnica";
      processo_tipo: "projeto" | "atendimento" | "instalacao";
      projeto_disciplina: "mecanico" | "eletrico";
      projeto_fase: "briefing" | "analise" | "entregaveis" | "liberacao";
      projeto_status: "em_elaboracao" | "em_aprovacao" | "liberado_producao" | "obsoleto";
      revisao_disciplina: "mecanica" | "eletrica";
      revisao_status:
        | "pendente"
        | "em_andamento"
        | "aprovada"
        | "aprovada_com_ressalvas"
        | "reprovada";
      sat_item_tipo:
        | "sim_nao_comentario"
        | "texto"
        | "numero"
        | "data"
        | "checkbox_multi"
        | "parametro_operacional"
        | "cabecalho";
      sat_relatorio_status: "rascunho" | "preenchendo" | "assinado" | "arquivado";
      tarefa_status: "aberta" | "concluida";
      template_evento_tipo: "kickoff" | "fat" | "embarque" | "instalacao" | "treinamento" | "outro";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "dashboard",
        "processos",
        "clientes",
        "comercial",
        "engenharia",
        "producao",
        "qualidade",
        "logistica",
        "pos_vendas",
        "know_how",
        "admin",
        "changelog",
        "fornecedores",
        "compras",
      ],
      app_role: [
        "admin",
        "manager",
        "engineer",
        "production",
        "purchasing",
        "assembly",
        "field",
        "sales",
      ],
      audit_action: ["INSERT", "UPDATE", "DELETE", "ACCESS"],
      chamado_autor_tipo: ["visitante", "atendente", "sistema"],
      chamado_evento_tipo: [
        "criado",
        "mensagem",
        "status_change",
        "assumido",
        "vinculado_equipamento",
        "resolvido",
        "reaberto",
        "notificacao_pendente",
        "arquivado",
        "prioridade_change",
        "atendente_change",
        "sla_estourado",
        "estagnado",
        "comentario_interno",
      ],
      chamado_origem: ["site_publico", "interno", "contato_site"],
      chamado_prioridade: ["baixa", "media", "alta", "critica"],
      chamado_status: [
        "aberto",
        "em_analise",
        "aguardando_cliente",
        "resolvido",
        "reaberto",
        "arquivado",
      ],
      checklist_acao: [
        "marcou_ok",
        "marcou_nok",
        "marcou_na",
        "desmarcou",
        "comentou",
        "anexou",
        "removeu_anexo",
      ],
      cliente_lifecycle: ["suspect", "prospect", "cliente", "inativo"],
      cotacao_convite_status: ["pendente", "visualizado", "respondido", "recusado"],
      cotacao_status: ["rascunho", "aberta", "respondida", "escolhida", "encerrada", "cancelada"],
      documento_aprovacao_acao: [
        "submeter",
        "aprovar",
        "rejeitar",
        "publicar",
        "arquivar",
        "reabrir",
      ],
      documento_idioma: ["pt", "es", "en"],
      documento_moeda: ["USD", "BRL", "EUR", "PYG"],
      documento_status: ["rascunho", "emitido", "arquivado", "em_revisao", "aprovado", "publicado"],
      equipamento_categoria: [
        "envase",
        "rotulagem",
        "embalagem_secundaria",
        "paletizacao",
        "transporte",
        "automacao",
        "outro",
      ],
      equipamento_doc_categoria: [
        "etp",
        "manual_mecanico",
        "manual_eletrico",
        "ficha_tecnica",
        "fat",
        "montagem",
        "desenho",
        "lista_pecas",
        "certificado",
        "outro",
        "esquema_eletrico",
      ],
      equipamento_status: [
        "planejamento",
        "em_fabricacao",
        "em_qualidade",
        "pronto_entrega",
        "em_transporte",
        "em_instalacao",
        "operacional",
        "manutencao",
        "parado",
        "descomissionado",
      ],
      etapa_fase: ["engenharia", "compras", "fabricacao", "montagem", "qualidade", "expedicao"],
      etapa_status: ["pendente", "em_andamento", "concluida", "atrasada", "bloqueada"],
      etp_historico_tipo: ["alteracao", "nota", "aprovacao", "status", "anexo", "reabertura"],
      etp_status: ["rascunho", "em_revisao", "aprovado", "obsoleto", "rejeitado"],
      fat_assinatura_tipo: ["inspetor", "testemunha"],
      fat_item_status: ["pendente", "ok", "nok", "na"],
      fat_item_tipo: [
        "ok_nok_na",
        "sim_nao_comentario",
        "texto",
        "numero",
        "data",
        "checkbox_multi",
        "parametro_operacional",
        "cabecalho",
      ],
      fat_rnc_status: ["aberta", "em_tratativa", "fechada", "cancelada"],
      fat_status: ["rascunho", "em_execucao", "aguardando_homologacao", "homologado", "reprovado"],
      fornecedor_ranking: ["A", "B", "C"],
      fornecedor_status: ["ativo", "em_avaliacao", "inativo", "bloqueado"],
      insumo_criticidade: ["baixa", "media", "alta", "critica"],
      insumo_rfq_canal: ["email", "whatsapp", "wechat", "telefone", "portal", "outro"],
      insumo_rfq_status: ["enviado", "respondido", "nao_respondeu", "descartado"],
      insumo_status: [
        "rascunho",
        "pronto_aprovacao",
        "aprovado",
        "em_cotacao",
        "cotado",
        "em_compra",
        "recebido",
        "cancelado",
      ],
      kh_item_status: ["rascunho", "em_revisao", "publicado", "arquivado"],
      kh_item_tipo: ["artigo", "video", "pdf", "checklist"],
      lifecycle_stage: ["suspect", "prospect", "cliente"],
      logistica_embarque_status: ["rascunho", "programado", "embarcado", "entregue", "cancelado"],
      lost_category: [
        "preco",
        "prazo",
        "concorrente",
        "escopo",
        "cliente_desistiu",
        "tecnico",
        "outro",
      ],
      montagem_status: ["nao_iniciada", "em_andamento", "concluida", "bloqueada"],
      oc_status: [
        "rascunho",
        "aguardando_aprovacao",
        "aprovada",
        "enviada",
        "recebida_parcial",
        "recebida",
        "cancelada",
      ],
      pipeline_stage: ["novo", "qualificado", "proposta", "negociacao", "ganho", "perdido"],
      processo_evento_kind: ["created", "stage_change", "task_created", "email_sent", "note"],
      processo_risco: ["Baixo", "Médio", "Alto"],
      processo_stage: [
        "Lead",
        "ETP",
        "Orçamento",
        "OC",
        "Eng. Mecânica",
        "Eng. Elétrica",
        "Montagem",
        "FAT",
        "Embarque",
        "Pós-venda",
        "Solicitação",
        "Análise",
        "Registro",
        "Resolução",
        "Encerrado",
        "Preparação",
        "Agendamento",
        "Arranque",
        "Treinamento",
        "Entrega Técnica",
      ],
      processo_tipo: ["projeto", "atendimento", "instalacao"],
      projeto_disciplina: ["mecanico", "eletrico"],
      projeto_fase: ["briefing", "analise", "entregaveis", "liberacao"],
      projeto_status: ["em_elaboracao", "em_aprovacao", "liberado_producao", "obsoleto"],
      revisao_disciplina: ["mecanica", "eletrica"],
      revisao_status: [
        "pendente",
        "em_andamento",
        "aprovada",
        "aprovada_com_ressalvas",
        "reprovada",
      ],
      sat_item_tipo: [
        "sim_nao_comentario",
        "texto",
        "numero",
        "data",
        "checkbox_multi",
        "parametro_operacional",
        "cabecalho",
      ],
      sat_relatorio_status: ["rascunho", "preenchendo", "assinado", "arquivado"],
      tarefa_status: ["aberta", "concluida"],
      template_evento_tipo: ["kickoff", "fat", "embarque", "instalacao", "treinamento", "outro"],
    },
  },
} as const;
