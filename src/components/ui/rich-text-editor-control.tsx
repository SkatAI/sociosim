"use client"

import type { IconButtonProps } from "@chakra-ui/react"
import { IconButton } from "@chakra-ui/react"
import { Editor } from "@tiptap/react"
import * as React from "react"
import { LuBold, LuHeading2, LuList } from "react-icons/lu"
import { useRichTextEditorContext } from "./rich-text-editor-context"
import { Tooltip } from "./tooltip"

export interface BaseControlConfig {
  label: string
  icon?: React.ElementType
  isDisabled?: (editor: Editor) => boolean
  getProps?: (editor: Editor) => Partial<IconButtonProps>
}

export interface ButtonControlProps
  extends Omit<IconButtonProps, "aria-label"> {
  icon: React.ReactNode
  label: string
}

export const ButtonControl = React.forwardRef<
  HTMLButtonElement,
  ButtonControlProps
>(function ButtonControl(props, ref) {
  const { icon, label, ...rest } = props
  return (
    <Tooltip content={label}>
      <IconButton ref={ref} size="2xs" aria-label={label} {...rest}>
        {icon}
      </IconButton>
    </Tooltip>
  )
})

///////////////////// Boolean Control /////////////////////

export interface BooleanControlConfig extends BaseControlConfig {
  icon: React.ElementType
  command: (editor: Editor) => void
  getVariant?: (editor: Editor) => IconButtonProps["variant"]
}

export function createBooleanControl(config: BooleanControlConfig) {
  const {
    label,
    icon: Icon,
    isDisabled,
    command,
    getVariant,
    getProps,
  } = config

  const BooleanControl = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    function BooleanControl(props, ref) {
      const { editor } = useRichTextEditorContext()
      if (!editor) return null
      const disabled = isDisabled ? isDisabled(editor) : false
      const dynamicProps = getProps ? getProps(editor) : {}
      const variant =
        getVariant && !getProps ? getVariant(editor) : dynamicProps.variant

      return (
        <ButtonControl
          ref={ref}
          label={label}
          icon={<Icon />}
          variant={variant}
          onClick={() => command(editor)}
          disabled={disabled}
          {...dynamicProps}
          {...props}
        />
      )
    },
  )

  BooleanControl.displayName = `BooleanControl(${label})`
  return BooleanControl
}

export const Bold = createBooleanControl({
  label: "Gras",
  icon: LuBold,
  command: (editor) => editor.chain().focus().toggleBold().run(),
  getVariant: (editor) => (editor.isActive("bold") ? "subtle" : "ghost"),
})

export const H2 = createBooleanControl({
  label: "Section",
  icon: LuHeading2,
  command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  getVariant: (editor) =>
    editor.isActive("heading", { level: 2 }) ? "subtle" : "ghost",
})

export const BulletList = createBooleanControl({
  label: "Liste",
  icon: LuList,
  command: (editor) => editor.chain().focus().toggleBulletList().run(),
  getVariant: (editor) => (editor.isActive("bulletList") ? "subtle" : "ghost"),
})
